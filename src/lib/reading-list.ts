export const deviceBookmarksKey = "astrobit:device-bookmarks:v1";
type BookmarkStorage = Pick<Storage, "getItem" | "setItem">;
export function decodeDeviceBookmarks(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string =>
      typeof id === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id),
    ).map((id) => id.toLowerCase()))].slice(0, 1000);
  } catch { return []; }
}
export function readDeviceBookmarks(fallback: string[] = [], storage?: BookmarkStorage) {
  try { return decodeDeviceBookmarks((storage || localStorage).getItem(deviceBookmarksKey)); }
  catch { return fallback; }
}
export function persistDeviceBookmarks(ids: string[], storage?: BookmarkStorage) {
  try { (storage || localStorage).setItem(deviceBookmarksKey, JSON.stringify(ids)); return true; }
  catch { return false; }
}
export function toggleBookmark(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
export function deviceImportIds(deviceIds: string[], publishedIds: string[]) {
  const available = new Set(publishedIds);
  return [...new Set(deviceIds)].filter((id) => available.has(id));
}
