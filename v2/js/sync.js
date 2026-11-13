import { FIREBASE_CONFIG, FIRESTORE_COLLECTIONS } from "./config.js";
import { addConflict, emit, getRecord, listAll, onPushRequested, saveRecord, store, updateSettings } from "./store.js";

const mods = { auth: null, db: null, authMod: null, fsMod: null };
let user = null;
const unsubs = [];
let pushing = false;
let booted = false;
const status = { text: "On this device", mode: "local", email: "" };

export function syncStatus() {
  return status;
}

function paint() {
  const pill = document.getElementById("sync-pill");
  if (pill) {
    pill.textContent = status.text;
    pill.dataset.mode = status.mode;
  }
  document.querySelectorAll("#account-btn, #account-btn-2").forEach((account) => {
    account.textContent = status.email ? "Sign out" : (account.id === "account-btn-2" ? "Sign in with Google" : "Sign in");
    account.dataset.action = status.email ? "sign-out" : "sign-in";
    account.title = status.email || "Sign in with Google to sync this study hub";
  });
}

function setStatus(text, mode) {
  status.text = text;
  status.mode = mode;
  paint();
}

export function paintSyncChrome() {
  paint();
}

function payloadOf(record) {
  const copy = { ...record };
  delete copy.dirty;
  delete copy.baseUpdatedAt;
  return copy;
}

async function applyRemote(name, remote) {
  if (!remote?.id) return;
  const local = getRecord(name, remote.id);
  if (!local) {
    await saveRecord(name, remote, { remote: true, silent: true, keepTimestamp: true, skipSync: true });
    return;
  }
  if (Number(local.updatedAt || 0) === Number(remote.updatedAt || 0)) {
    if (local.dirty) {
      await saveRecord(name, { ...local, deleted: !!remote.deleted }, { keepTimestamp: true, keepDirty: false, silent: true, skipSync: true });
    }
    return;
  }
  const remoteNewer = Number(remote.updatedAt || 0) > Number(local.updatedAt || 0);
  const remoteSinceBase = Number(remote.updatedAt || 0) > Number(local.baseUpdatedAt || 0);
  if (local.dirty && remoteSinceBase) {
    await addConflict({
      id: `conflict_${name}_${remote.id}`,
      collection: name,
      recordId: remote.id,
      local: { ...local },
      remote,
      at: Date.now(),
      title: local.title || local.code || local.text || remote.title || remote.id
    });
    if (remoteNewer) await saveRecord(name, remote, { remote: true, silent: true, keepTimestamp: true, skipSync: true });
    return;
  }
  if (!local.dirty && (remoteNewer || remote.deleted)) {
    await saveRecord(name, remote, { remote: true, silent: true, keepTimestamp: true, skipSync: true });
  }
}

export async function pushDirty() {
  if (!mods.db || !user || pushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setStatus("Offline — saved on this device", "offline");
    return;
  }
  pushing = true;
  setStatus("Syncing…", "sync");
  try {
    const { writeBatch, doc } = mods.fsMod;
    const dirty = [];
    for (const name of FIRESTORE_COLLECTIONS) {
      for (const rec of listAll(name)) {
        if (!rec.dirty) continue;
        if (name === "blobs" && rec.dataUrl && rec.dataUrl.length > 150000) {
          await saveRecord(name, { ...rec, localOnly: true }, { keepTimestamp: true, keepDirty: false, silent: true, skipSync: true });
          continue;
        }
        dirty.push([name, rec]);
      }
    }
    for (let i = 0; i < dirty.length; i += 400) {
      const slice = dirty.slice(i, i + 400);
      const batch = writeBatch(mods.db);
      for (const [name, rec] of slice) {
        batch.set(doc(mods.db, "users", user.uid, name, rec.id), payloadOf(rec), { merge: true });
      }
      await batch.commit();
      for (const [name, rec] of slice) {
        const current = getRecord(name, rec.id);
        if (current && Number(current.updatedAt) === Number(rec.updatedAt)) {
          await saveRecord(name, current, { keepTimestamp: true, keepDirty: false, silent: true, skipSync: true });
        }
      }
    }
    if (store.settings.dirty) {
      const { setDoc, doc: docRef } = mods.fsMod;
      const settings = payloadOf(store.settings);
      await setDoc(docRef(mods.db, "users", user.uid, "meta", "settings"), settings, { merge: true });
      await updateSettings(store.settings, { remote: true, silent: true, keepTimestamp: true, skipSync: true });
    }
    setStatus(status.email ? `Synced · ${status.email}` : "Synced", "ok");
  } catch (error) {
    console.error(error);
    const denied = String(error?.code || "").includes("permission") || String(error?.message || "").includes("permission");
    setStatus(denied ? "Saved here — Firebase rules blocked sync" : "Saved here — sync will retry", "error");
  } finally {
    pushing = false;
  }
}

function stopListeners() {
  while (unsubs.length) unsubs.pop()();
}

async function startSession(nextUser) {
  stopListeners();
  user = nextUser;
  status.email = nextUser.email || "Google account";
  booted = false;
  setStatus(`Signed in · ${status.email}`, "sync");
  const { collection, doc, onSnapshot } = mods.fsMod;
  let first = FIRESTORE_COLLECTIONS.length + 1;
  const markFirst = () => {
    first -= 1;
    if (first <= 0 && !booted) {
      booted = true;
      emit();
      pushDirty();
    }
  };
  for (const name of FIRESTORE_COLLECTIONS) {
    const unsub = onSnapshot(collection(mods.db, "users", user.uid, name), async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type === "removed") {
          const existing = getRecord(name, change.doc.id);
          if (existing && !existing.deleted) {
            await saveRecord(name, { ...existing, deleted: true, updatedAt: Date.now() }, { remote: true, silent: true, keepTimestamp: true, skipSync: true });
          }
        } else {
          await applyRemote(name, change.doc.data());
        }
      }
      emit();
      markFirst();
    }, (error) => {
      console.error(error);
      setStatus("Saved here — check Firebase rules", "error");
      markFirst();
    });
    unsubs.push(unsub);
  }
  const unsubSettings = onSnapshot(doc(mods.db, "users", user.uid, "meta", "settings"), async (snap) => {
    if (snap.exists()) {
      const remote = snap.data();
      const localDirty = !!store.settings.dirty;
      const remoteNewer = Number(remote.updatedAt || 0) > Number(store.settings.updatedAt || 0);
      if (!localDirty && remoteNewer) await updateSettings(remote, { remote: true, keepTimestamp: true, skipSync: true });
      if (localDirty && remoteNewer && Number(remote.updatedAt || 0) !== Number(store.settings.updatedAt || 0)) {
        await addConflict({
          id: "conflict_settings",
          collection: "settings",
          recordId: "settings",
          local: { ...store.settings },
          remote,
          at: Date.now(),
          title: "Settings"
        });
      }
    }
    emit();
    markFirst();
  }, (error) => {
    console.error(error);
    markFirst();
  });
  unsubs.push(unsubSettings);
}

export async function initSync() {
  onPushRequested(() => pushDirty());
  window.addEventListener("online", () => {
    if (user) pushDirty();
    else setStatus("On this device", "local");
  });
  window.addEventListener("offline", () => {
    if (user) setStatus("Offline — saved on this device", "offline");
  });
  try {
    const appMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    mods.authMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    mods.fsMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const app = appMod.initializeApp(FIREBASE_CONFIG);
    mods.auth = mods.authMod.getAuth(app);
    mods.db = mods.fsMod.getFirestore(app);
    mods.authMod.onAuthStateChanged(mods.auth, (next) => {
      if (next) startSession(next).catch((error) => {
        console.error(error);
        setStatus("Signed in, sync paused", "error");
      });
      else {
        stopListeners();
        user = null;
        status.email = "";
        setStatus("On this device", "local");
      }
    });
  } catch (error) {
    console.error("Firebase did not load", error);
    setStatus("On this device", "local");
  }
}

export async function signInGoogle() {
  if (!mods.auth || !mods.authMod) {
    throw new Error("Google sign-in could not be loaded. You can keep working on this device, then try again when you are online.");
  }
  const provider = new mods.authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await mods.authMod.signInWithPopup(mods.auth, provider);
  } catch (error) {
    if (error?.code === "auth/popup-blocked") {
      await mods.authMod.signInWithRedirect(mods.auth, provider);
      return;
    }
    throw error;
  }
}

export async function signOutGoogle() {
  if (!mods.auth || !mods.authMod) return;
  await mods.authMod.signOut(mods.auth);
}

export function signedInEmail() {
  return status.email;
}
