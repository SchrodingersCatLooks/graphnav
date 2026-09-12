"""Generates the GraphNav demo paper PDF.

Authored demo content, not a real publication and not anyone's private
document. It mirrors the demo Doc's subject so a Drive folder, a tabbed Doc,
and a paper all tell one story during the walkthrough.

Six pages with a bookmark outline three levels deep, so section extraction has
real nesting and at least three jump targets to demonstrate.
"""
import pathlib

PAGE_W, PAGE_H = 612, 792


def page_stream(heading, subheading, paragraphs):
    """A 20pt heading, an optional 14pt subheading, then 11pt body lines."""
    body = f"BT /F1 20 Tf 72 720 Td ({heading}) Tj ET\n"
    y = 688
    if subheading:
        body += f"BT /F1 14 Tf 72 {y} Td ({subheading}) Tj ET\n"
        y -= 26
    for line in paragraphs:
        body += f"BT /F2 11 Tf 72 {y} Td ({line}) Tj ET\n"
        y -= 16
    return f"<< /Length {len(body)} >>\nstream\n{body}endstream"


PAGES = [
    ("Campus Wayfinding Study", "Overview", [
        "Students and visitors navigate using signage, mobile maps, and habit.",
        "Prior work suggests people scan for a single confirming detail.",
        "This study asks where that scanning breaks down, and whether the",
        "failures cluster in places that can be predicted in advance.",
    ]),
    ("Scope and Definitions", None, [
        "A junction is any point offering two or more onward paths.",
        "A backtrack is a return to a previously visited junction.",
        "First correct turn is the first heading change that reduces",
        "remaining distance to the stated destination.",
        "Outdoor routing and emergency egress are out of scope.",
    ]),
    ("Methods", "Participants and procedure", [
        "Twenty-four participants, none familiar with the study building.",
        "Four timed trials each, destinations presented in random order.",
        "Participants thought aloud while a researcher logged junction events.",
        "Audio was transcribed and coded for expressions of uncertainty.",
    ]),
    ("Findings", "Where navigation failed", [
        "Median time to first correct turn was eleven seconds.",
        "The distribution was strongly right skewed at the entrance junction.",
        "Backtracking concentrated at three junctions, all unsigned, all",
        "offering three or more onward paths.",
        "Two-path junctions produced almost no backtracking.",
    ]),
    ("The Single Sign Intervention", None, [
        "One directional sign at the worst junction halved backtracks there.",
        "The effect did not transfer to other junctions.",
        "This supports a decision-point account over signage quantity.",
    ]),
    ("Limitations", None, [
        "One building, twenty-four participants, one signage style.",
        "Think-aloud protocols may themselves slow navigation.",
        "We did not test whether the effect survives familiarity.",
    ]),
]

# Object numbering: 1 catalog, 2 pages, 3..8 pages, 9..14 contents,
# 15/16 fonts, 17 outline root, 18.. outline items.
FIRST_PAGE, FIRST_CONTENT = 3, 9
FONT_BOLD, FONT_BODY, OUTLINE_ROOT = 15, 16, 17

objects = {
    1: "<< /Type /Catalog /Pages 2 0 R /Outlines 17 0 R /PageMode /UseOutlines >>",
    2: "<< /Type /Pages /Kids [%s] /Count %d >>" % (
        " ".join(f"{FIRST_PAGE + i} 0 R" for i in range(len(PAGES))), len(PAGES)),
    FONT_BOLD: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    FONT_BODY: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
}

for i, (heading, sub, paras) in enumerate(PAGES):
    objects[FIRST_PAGE + i] = (
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
        f"/Resources << /Font << /F1 {FONT_BOLD} 0 R /F2 {FONT_BODY} 0 R >> >> "
        f"/Contents {FIRST_CONTENT + i} 0 R >>"
    )
    objects[FIRST_CONTENT + i] = page_stream(heading, sub, paras)

# Outline: Overview (with nested Scope and Definitions), Methods (with nested
# Findings, which itself nests The Single Sign Intervention), Limitations.
def dest(page_index, y=720):
    return f"[{FIRST_PAGE + page_index} 0 R /XYZ 72 {y} 0]"


objects[OUTLINE_ROOT] = "<< /Type /Outlines /First 18 0 R /Last 22 0 R /Count 6 >>"
objects[18] = f"<< /Title (Overview) /Parent 17 0 R /Next 20 0 R /First 19 0 R /Last 19 0 R /Count 1 /Dest {dest(0)} >>"
objects[19] = f"<< /Title (Scope and Definitions) /Parent 18 0 R /Dest {dest(1)} >>"
objects[20] = f"<< /Title (Methods) /Parent 17 0 R /Prev 18 0 R /Next 22 0 R /First 21 0 R /Last 21 0 R /Count 2 /Dest {dest(2)} >>"
objects[21] = f"<< /Title (Findings) /Parent 20 0 R /First 23 0 R /Last 23 0 R /Count 1 /Dest {dest(3)} >>"
objects[23] = f"<< /Title (The Single Sign Intervention) /Parent 21 0 R /Dest {dest(4)} >>"
objects[22] = f"<< /Title (Limitations) /Parent 17 0 R /Prev 20 0 R /Dest {dest(5)} >>"

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
    if num in offsets:
        out += f"{offsets[num]:010d} 00000 n \n".encode()
    else:
        out += b"0000000000 65535 f \n"
out += f"trailer\n<< /Size {count} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF\n".encode()

path = pathlib.Path(__file__).with_name("GraphNav-demo-paper.pdf")
path.write_bytes(bytes(out))
print(f"wrote {path} ({len(out)} bytes, {len(PAGES)} pages)")
