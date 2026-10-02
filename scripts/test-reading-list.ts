import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeDeviceBookmarks, deviceBookmarksKey, deviceImportIds, persistDeviceBookmarks, readDeviceBookmarks, toggleBookmark } from "../src/lib/reading-list";

const one = "00000000-0000-4000-8000-000000000001";
const two = "00000000-0000-4000-8000-000000000002";
const three = "00000000-0000-4000-8000-000000000003";
test("Device saves reject malformed data and deduplicate valid post IDs", () => {
  assert.deepEqual(decodeDeviceBookmarks("{broken"), []);
  assert.deepEqual(decodeDeviceBookmarks('{"owner":true}'), []);
  assert.deepEqual(decodeDeviceBookmarks(JSON.stringify([one, one, "javascript:alert(1)", null, {}, two])), [one, two]);
  assert.deepEqual(decodeDeviceBookmarks(null), []);
});
test("Device save, remove and undo persist without changing the previous list", () => {
  const map = new Map<string, string>();
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const original = [one];
  const saved = toggleBookmark(original, two);
  assert.equal(persistDeviceBookmarks(saved, storage), true);
  assert.deepEqual(readDeviceBookmarks([], storage), [one, two]);
  assert.deepEqual(original, [one]);
  const removed = toggleBookmark(saved, one);
  assert.deepEqual(removed, [two]);
  assert.equal(persistDeviceBookmarks(toggleBookmark(removed, one), storage), true);
  assert.deepEqual(readDeviceBookmarks([], storage), [two, one]);
  assert.ok(map.has(deviceBookmarksKey));
});
test("Blocked storage reports failed persistence and keeps in-memory saves readable", () => {
  const blocked = { getItem: (): string => { throw new Error("Blocked"); }, setItem: () => { throw new Error("Quota exceeded"); } };
  assert.equal(persistDeviceBookmarks([one], blocked), false);
  assert.deepEqual(readDeviceBookmarks([one], blocked), [one]);
});
test("Import includes only available published IDs and preserves the device list", () => {
  const device = [one, two, two, three];
  assert.deepEqual(deviceImportIds(device, [one, two]), [one, two]);
  assert.deepEqual(deviceImportIds(device, []), []);
  assert.deepEqual(device, [one, two, two, three]);
});
