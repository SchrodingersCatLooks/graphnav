const normalize = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(row[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = row;
  }
  return previous[b.length]!;
}
/** Exact, prefix, substring, then typo-tolerant matches in names already loaded. */
export function nameMatch(query: string, title: string): number | null {
  const q = normalize(query), name = normalize(title);
  if (!q) return 0;
  if (name === q) return 0;
  if (name.startsWith(q)) return 1 + (name.length - q.length) / 1000;
  const words = name.split(/\s+/);
  if (words.some((word) => word.startsWith(q))) return 2 + name.length / 1000;
  const at = name.indexOf(q);
  if (at >= 0) return 3 + at / 1000;
  if (q.length < 3) return null;
  const difference = Math.min(distance(q, name), ...words.map((word) => distance(q, word)));
  return difference <= Math.max(1, Math.floor(q.length / 3)) ? 4 + difference : null;
}
