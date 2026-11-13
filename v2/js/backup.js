import { dateKey } from "./dates.js";
import { idbGet, idbPut, RECORD_STORES } from "./db.js";
import { isV1Export, isV2Export, migrateV1 } from "./migrate.js";
import { mergeById } from "./merge.js";
import { forgetBackup, listAll, rememberBackup, replaceAll, saveMany, store } from "./store.js";

const KEEP = 14;

export function exportPayload() {
  const data = { app: "studyhub-v2", version: 2, exportedAt: new Date().toISOString() };
  for (const name of RECORD_STORES) {
    data[name] = listAll(name).filter((rec) => !rec.deleted).map((rec) => {
      const copy = { ...rec };
      delete copy.dirty;
      delete copy.baseUpdatedAt;
      return copy;
    });
  }
  return data;
}

export async function ensureDailyBackup(now = Date.now()) {
  const day = dateKey(now, "Australia/Adelaide");
  const state = await idbGet("meta", "backup-state");
  if (state?.day === day) return false;
  const backup = { id: day, createdAt: now, json: exportPayload() };
  await rememberBackup(backup);
  const extra = store.backups.slice(KEEP);
  for (const old of extra) await forgetBackup(old.id);
  await idbPut("meta", { id: "backup-state", day });
  return true;
}

export async function restoreBackup(id) {
  const backup = store.backups.find((row) => row.id === id);
  if (!backup?.json) throw new Error("That backup could not be read.");
  await replaceAll(collectionsFrom(backup.json));
}

export function collectionsFrom(data) {
  const out = {};
  for (const name of RECORD_STORES) out[name] = Array.isArray(data[name]) ? data[name] : [];
  return out;
}

export function prepareImport(parsed) {
  if (isV2Export(parsed)) {
    return { kind: "v2", collections: collectionsFrom(parsed), warnings: [] };
  }
  if (isV1Export(parsed)) {
    const migrated = migrateV1(parsed);
    return { kind: "v1", collections: migrated, warnings: migrated.warnings || [] };
  }
  throw new Error("That file is not a Study Hub backup or a version 1 export.");
}

export async function mergeImport(collections) {
  const groups = {};
  for (const name of RECORD_STORES) {
    groups[name] = mergeById(listAll(name), collections[name] || []);
  }
  await saveMany(groups, { keepTimestamp: true });
}

export async function readV1Local() {
  const raw = localStorage.getItem("counsellingStudyToolkit_v2");
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!isV1Export(parsed)) throw new Error("The data saved by version 1 on this device was not in the expected shape.");
  return parsed;
}
