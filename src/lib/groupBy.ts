/**
 * Groups rows under a key (rows with no key are left out), so a list page can look up
 * "this creator's shipments" in O(1) per row instead of scanning every record.
 */
export function groupBy<T>(
  rows: readonly T[],
  keyOf: (row: T) => string | null | undefined,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}
