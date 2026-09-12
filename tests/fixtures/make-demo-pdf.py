"""Generates a labeled synthetic PDF fixture for M4-B extraction tests.

Three pages with headings and a bookmark outline containing one nested entry,
so section extraction and nesting can be checked without a real paper. This is
a fixture, not demo content.
"""
import pathlib

def stream(heading, lines):
    """A 24pt heading over 11pt body text, so heading detection has a real signal."""
    body = f"BT /F1 24 Tf 72 720 Td ({heading}) Tj ET\n"
    y = 680
    for line in lines:
        body += f"BT /F1 11 Tf 72 {y} Td ({line}) Tj ET\n"
        y -= 16
    return f"<< /Length {len(body)} >>\nstream\n{body}endstream"

objects = {
    1: "<< /Type /Catalog /Pages 2 0 R /Outlines 10 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>",
    3: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 9 0 R >> >> /Contents 6 0 R >>",
    4: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 9 0 R >> >> /Contents 7 0 R >>",
    5: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 9 0 R >> >> /Contents 8 0 R >>",
    6: stream("Overview", [
        "Wayfinding failures cluster at a small number of junctions.",
        "This study asks where scanning breaks down on campus.",
        "Signage budget is the usual framing; decision points fit better.",
    ]),
    7: stream("Methods", [
        "Twenty-four participants completed four timed trials each.",
        "Junction events were logged by a researcher following at distance.",
        "Think-aloud audio was transcribed and coded for uncertainty.",
    ]),
    8: stream("Findings", [
        "Median time to first correct turn was eleven seconds.",
        "Backtracking concentrated at three unsigned junctions.",
        "One added sign halved backtracks at the worst junction.",
    ]),
    9: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    10: "<< /Type /Outlines /First 11 0 R /Last 13 0 R /Count 4 >>",
    # Overview, with one nested child, so nesting is exercised.
    11: "<< /Title (Overview) /Parent 10 0 R /Next 12 0 R /First 14 0 R /Last 14 0 R /Count 1 /Dest [3 0 R /XYZ 72 720 0] >>",
    12: "<< /Title (Methods) /Parent 10 0 R /Prev 11 0 R /Next 13 0 R /Dest [4 0 R /XYZ 72 720 0] >>",
    13: "<< /Title (Findings) /Parent 10 0 R /Prev 12 0 R /Dest [5 0 R /XYZ 72 720 0] >>",
    14: "<< /Title (Scope and Definitions) /Parent 11 0 R /Dest [3 0 R /XYZ 72 600 0] >>",
}

out = bytearray(b"%PDF-1.7\n")
offsets = {}
for num in sorted(objects):
    offsets[num] = len(out)
    out += f"{num} 0 obj\n{objects[num]}\nendobj\n".encode("latin-1")

xref_at = len(out)
count = max(objects) + 1
out += f"xref\n0 {count}\n".encode()
out += b"0000000000 65535 f \n"
for num in range(1, count):
    out += f"{offsets[num]:010d} 00000 n \n".encode()
out += f"trailer\n<< /Size {count} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF\n".encode()

path = pathlib.Path(__file__).with_name("demo-paper.pdf")
path.write_bytes(bytes(out))
print(f"wrote {path} ({len(out)} bytes)")
