// Firebase project settings. Paste the values from
// Firebase console → Project settings → Your apps → Web app → SDK setup (Config).
// While apiKey is empty the pages run in demo mode: everything is saved
// only in the current browser. See SETUP.md.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// Only this Google account can open the admin page and moderate reviews.
// Keep it in sync with ADMIN_EMAIL in firestore.rules.
export const ADMIN_EMAIL = "marco.sandroni25@gmail.com";
