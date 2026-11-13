/** Merge records by id. Incoming wins when its updatedAt is newer or equal. */

export function mergeById(current = [], incoming = []) {
  const map = new Map();
  for (const rec of current) {
    if (rec && rec.id) map.set(rec.id, rec);
  }
  for (const rec of incoming) {
    if (!rec || !rec.id) continue;
    const prev = map.get(rec.id);
    if (!prev || Number(rec.updatedAt || 0) >= Number(prev.updatedAt || 0)) {
      map.set(rec.id, { ...prev, ...rec, deleted: !!rec.deleted });
    }
  }
  return [...map.values()];
}
