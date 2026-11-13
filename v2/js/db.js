const DB_NAME = "studyhub-v2";
const DB_VERSION = 1;

export const RECORD_STORES = [
  "courses",
  "modules",
  "items",
  "assignments",
  "books",
  "journal",
  "cards",
  "captures",
  "reviews",
  "blobs"
];

const STORES = [...RECORD_STORES, "backups", "conflicts", "meta"];

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise = null;
function db() {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

function request(storeName, mode, fn) {
  return db().then((database) => new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  }));
}

export function idbAll(storeName) {
  return db().then((database) => new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

export function idbGet(storeName, id) {
  return db().then((database) => new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
}

export function idbPut(storeName, record) {
  return db().then((database) => new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Could not save. This browser may be out of space."));
  }));
}

export function idbDelete(storeName, id) {
  return request(storeName, "readwrite", (store) => store.delete(id));
}

export async function idbBulkPut(entries) {
  const database = await db();
  const names = [...new Set(entries.map(([name]) => name))];
  await new Promise((resolve, reject) => {
    const tx = database.transaction(names, "readwrite");
    for (const [name, record] of entries) tx.objectStore(name).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Could not save. This browser may be out of space."));
  });
}
