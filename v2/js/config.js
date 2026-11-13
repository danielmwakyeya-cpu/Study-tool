/**
 * Public Firebase web config for the existing project `daniel-study-tool`.
 * This apiKey is a client identifier, not a secret. Access is limited by
 * firestore.rules (only the signed-in user's own documents). It is the same
 * project as version 1, but version 2 never reads or writes the Realtime
 * Database path `counsellingStudyToolkit`.
 *
 * Version 2 does not store an Anthropic (or any other AI) key.
 */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD2pV_rCmLLaVDE7RVi7WOQV_f1aPUtjw8",
  authDomain: "daniel-study-tool.firebaseapp.com",
  databaseURL: "https://daniel-study-tool-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "daniel-study-tool",
  storageBucket: "daniel-study-tool.firebasestorage.app",
  messagingSenderId: "1039217707701",
  appId: "1:1039217707701:web:4181976f1b38648261ccfc"
};

export const FIRESTORE_COLLECTIONS = [
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
