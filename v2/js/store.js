import { idbAll, idbBulkPut, idbDelete, idbGet, idbPut, RECORD_STORES } from "./db.js";
import { clone } from "./util.js";

const listeners = new Set();

export const store = {
  data: Object.fromEntries(RECORD_STORES.map((name) => [name, []])),
  conflicts: [],
  backups: [],
  settings: {
    theme: "light",
    deadlineZone: "Australia/Perth",
    homeZone: "Australia/Adelaide"
  },
  ready: false
};

function emit() {
  for (const fn of listeners) fn();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function initStore() {
  for (const name of RECORD_STORES) {
    store.data[name] = await idbAll(name);
  }
  store.conflicts = await idbAll("conflicts");
  store.backups = (await idbAll("backups")).sort((a, b) => b.id.localeCompare(a.id));
  const settings = await idbGet("meta", "settings");
  if (settings) store.settings = { ...store.settings, ...settings, id: "settings" };
  const savedTheme = localStorage.getItem("studyhub-v2-theme");
  if (savedTheme === "dark" || savedTheme === "light") store.settings.theme = savedTheme;
  applyTheme(store.settings.theme);
  store.ready = true;
}

export function list(name) {
  return (store.data[name] || []).filter((rec) => rec && !rec.deleted);
}

export function listAll(name) {
  return store.data[name] || [];
}

export function getRecord(name, id) {
  return (store.data[name] || []).find((rec) => rec.id === id) || null;
}

function upsertMemory(name, record) {
  const rows = store.data[name] || [];
  const index = rows.findIndex((rec) => rec.id === record.id);
  if (index === -1) rows.push(record);
  else rows[index] = record;
  store.data[name] = rows;
}

export async function saveRecord(name, record, opts = {}) {
  const prev = getRecord(name, record.id) || (store.data[name] || []).find((rec) => rec.id === record.id) || {};
  const next = {
    ...prev,
    ...record,
    id: record.id,
    updatedAt: opts.keepTimestamp ? (record.updatedAt || prev.updatedAt || Date.now()) : Date.now(),
    deleted: !!record.deleted
  };
  if (opts.remote) {
    next.dirty = false;
    next.baseUpdatedAt = next.updatedAt;
  } else if (opts.keepDirty === false) {
    next.dirty = false;
    next.baseUpdatedAt = next.updatedAt;
  } else {
    next.dirty = true;
  }
  upsertMemory(name, next);
  try {
    await idbPut(name, next);
  } catch (error) {
    console.error(error);
    throw error;
  }
  if (!opts.silent) emit();
  if (!opts.remote && !opts.skipSync) schedulePush();
  return next;
}

export async function removeRecord(name, id, opts = {}) {
  const prev = (store.data[name] || []).find((rec) => rec.id === id);
  if (!prev) return null;
  return saveRecord(name, { ...prev, deleted: true }, opts);
}

export async function saveMany(groups, opts = {}) {
  const entries = [];
  for (const [name, records] of Object.entries(groups)) {
    if (!RECORD_STORES.includes(name)) continue;
    for (const record of records || []) {
      const prev = (store.data[name] || []).find((rec) => rec.id === record.id) || {};
      const next = {
        ...prev,
        ...record,
        id: record.id,
        updatedAt: opts.keepTimestamp ? (record.updatedAt || Date.now()) : Date.now(),
        dirty: opts.remote ? false : true,
        deleted: !!record.deleted
      };
      if (opts.remote || opts.keepDirty === false) {
        next.dirty = false;
        next.baseUpdatedAt = next.updatedAt;
      }
      upsertMemory(name, next);
      entries.push([name, next]);
    }
  }
  if (entries.length) await idbBulkPut(entries);
  if (!opts.silent) emit();
  if (!opts.remote && !opts.skipSync) schedulePush();
}

export async function replaceAll(groups) {
  const entries = [];
  for (const name of RECORD_STORES) {
    const incoming = groups[name] || [];
    const incomingIds = new Set(incoming.map((rec) => rec.id));
    for (const prev of store.data[name] || []) {
      if (!incomingIds.has(prev.id) && !prev.deleted) {
        const tomb = { ...prev, deleted: true, dirty: true, updatedAt: Date.now() };
        upsertMemory(name, tomb);
        entries.push([name, tomb]);
      }
    }
    for (const record of incoming) {
      const next = {
        ...record,
        id: record.id,
        updatedAt: record.updatedAt || Date.now(),
        dirty: true,
        deleted: false
      };
      upsertMemory(name, next);
      entries.push([name, next]);
    }
  }
  if (entries.length) await idbBulkPut(entries);
  emit();
  schedulePush();
}

export async function updateSettings(partial, opts = {}) {
  const updatedAt = opts.keepTimestamp ? (partial.updatedAt || store.settings.updatedAt || Date.now()) : Date.now();
  store.settings = {
    ...store.settings,
    ...partial,
    id: "settings",
    updatedAt,
    dirty: opts.remote ? false : true
  };
  if (opts.remote) store.settings.baseUpdatedAt = updatedAt;
  await idbPut("meta", store.settings);
  if (partial.theme) applyTheme(partial.theme);
  if (!opts.silent) emit();
  if (!opts.remote && !opts.skipSync) schedulePush();
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  localStorage.setItem("studyhub-v2-theme", theme === "dark" ? "dark" : "light");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1820" : "#0e2433");
}

export async function addConflict(conflict) {
  store.conflicts = store.conflicts.filter((row) => row.id !== conflict.id).concat(conflict);
  await idbPut("conflicts", conflict);
  emit();
}

export async function forgetConflict(id) {
  store.conflicts = store.conflicts.filter((row) => row.id !== id);
  await idbDelete("conflicts", id);
  emit();
}

export async function rememberBackup(backup) {
  store.backups = [backup, ...store.backups.filter((row) => row.id !== backup.id)].sort((a, b) => b.id.localeCompare(a.id));
  await idbPut("backups", backup);
}

export async function forgetBackup(id) {
  store.backups = store.backups.filter((row) => row.id !== id);
  await idbDelete("backups", id);
}

let pushTimer = null;
let pusher = null;

export function onPushRequested(fn) {
  pusher = fn;
}

function schedulePush() {
  if (!pusher) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    Promise.resolve(pusher()).catch((error) => console.error("Sync failed", error));
  }, 700);
}

export function requestPush() {
  schedulePush();
}

export function snapshotDirty() {
  const out = {};
  for (const name of RECORD_STORES) out[name] = (store.data[name] || []).filter((rec) => rec.dirty).map((rec) => clone(rec));
  if (store.settings.dirty) out.settings = clone(store.settings);
  return out;
}

export { emit };
