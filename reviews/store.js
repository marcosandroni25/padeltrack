// Data layer shared by the public page and the admin page.
// Uses Firebase (Firestore + Auth) when config.js is filled in,
// otherwise a demo store kept in this browser's localStorage.
import { firebaseConfig, ADMIN_EMAIL } from "./config.js";

export const CATEGORIES = [
  { key: "technical", label: "Technical knowledge" },
  { key: "communication", label: "Communication and clarity" },
  { key: "planning", label: "Lesson planning and structure" },
  { key: "motivation", label: "Motivation and attitude" },
  { key: "professionalism", label: "Professionalism and reliability" },
];

export const LIMITS = { comment: 100, name: 40, country: 56, photos: 3, reply: 500 };

export const DEFAULT_PROFILE = {
  name: "Marco Sandroni",
  headline: "Padel coach · Motor sciences graduate",
  experienceYears: 6,
  levels: "All levels, from beginner to competition",
  languages: "Italian, English, Spanish",
  price: "",
  email: "marco.sandroni25@gmail.com",
  bio: "Most clinics start from the game and correct on the fly. Marco works the other way round. He starts from how each player's body moves, builds an efficient, conscious technique, and only then takes it to tactics, mindset and the match.",
  photo: "",
};

const DAY = 86400000;
const SAMPLE_REVIEWS = [
  { id: "sample-1", firstName: "Lucía", lastName: "Fernández", country: "Spain", days: 3,
    ratings: { technical: 5, communication: 5, planning: 5, motivation: 5, professionalism: 5 },
    comment: "My bandeja finally starts in my legs. Every drill had a clear reason behind it." },
  { id: "sample-2", firstName: "Tom", lastName: "Becker", country: "Germany", days: 9,
    ratings: { technical: 5, communication: 4, planning: 5, motivation: 4, professionalism: 5 },
    comment: "Video analysis on day 1 and day 5 showed exactly what changed. Great structure." },
  { id: "sample-3", firstName: "Giulia", lastName: "Rossi", country: "Italy", days: 17,
    ratings: { technical: 5, communication: 5, planning: 4, motivation: 5, professionalism: 5 },
    comment: "Lezioni in italiano, chiarissime. Power from technique, not strength. It works." },
  { id: "sample-4", firstName: "Martín", lastName: "Gómez", country: "Argentina", days: 30,
    ratings: { technical: 4, communication: 4, planning: 4, motivation: 5, professionalism: 4 },
    comment: "Good energy on court. I'd like a bit more match play at the end of each session." },
  { id: "sample-5", firstName: "Emma", lastName: "Clarke", country: "United Kingdom", days: 46,
    ratings: { technical: 5, communication: 5, planning: 5, motivation: 4, professionalism: 5 },
    comment: "Beginner here. He explained the split-step so simply that it clicked in one lesson." },
];

export function overallOf(r) {
  const vals = CATEGORIES.map((c) => Number(r.ratings?.[c.key]) || 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function sampleDocs(now = Date.now()) {
  return SAMPLE_REVIEWS.map(({ days, ...r }) => ({
    ...r, photos: [], hidden: false, reply: null, sample: true,
    createdAt: now - days * DAY, updatedAt: now - days * DAY,
  }));
}

export function cleanReviewInput(input) {
  const s = (v, max) => String(v ?? "").trim().slice(0, max);
  const ratings = {};
  for (const c of CATEGORIES) {
    const n = Math.round(Number(input.ratings?.[c.key]));
    if (!(n >= 1 && n <= 5)) throw new Error(`Rate "${c.label}" from 1 to 5 stars.`);
    ratings[c.key] = n;
  }
  const out = {
    firstName: s(input.firstName, LIMITS.name),
    lastName: s(input.lastName, LIMITS.name),
    country: s(input.country, LIMITS.country),
    comment: s(input.comment, LIMITS.comment),
    photos: (input.photos || []).slice(0, LIMITS.photos),
    ratings,
  };
  if (!out.firstName || !out.lastName) throw new Error("Add your first and last name.");
  if (!out.country) throw new Error("Add your country.");
  if (!out.comment) throw new Error("Write a short comment (up to 100 characters).");
  return out;
}

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export async function createStore() {
  return isConfigured ? createFirebaseStore() : createLocalStore();
}

/* ---------------- Demo store (localStorage) ---------------- */

function createLocalStore() {
  const K = { reviews: "msr.reviews.v1", profile: "msr.profile.v1", uid: "msr.uid.v1", seeded: "msr.seeded.v1", admin: "msr.demoAdmin.v1" };
  const read = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
  const write = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch { throw new Error("This browser's storage is full. Remove a photo and try again."); }
  };

  let uid = read(K.uid, null);
  if (!uid) { uid = "demo-" + Math.random().toString(36).slice(2, 12); write(K.uid, uid); }
  if (!read(K.seeded, false)) {
    const map = read(K.reviews, {});
    for (const d of sampleDocs()) map[d.id] = d;
    write(K.reviews, map); write(K.seeded, true);
  }

  const subs = { reviews: new Set(), profile: new Set(), mine: new Set(), admin: new Set() };
  const all = () => Object.values(read(K.reviews, {}));
  const emit = () => {
    const list = all();
    subs.reviews.forEach(({ cb, admin }) => cb(admin ? list : list.filter((r) => !r.hidden)));
    subs.mine.forEach((cb) => cb(read(K.reviews, {})[uid] || null));
    subs.profile.forEach((cb) => cb({ ...DEFAULT_PROFILE, ...read(K.profile, {}) }));
  };
  window.addEventListener("storage", emit);
  const mutate = (fn) => { const map = read(K.reviews, {}); fn(map); write(K.reviews, map); emit(); };

  return {
    mode: "demo",
    async ready() { return uid; },
    uid: () => uid,
    watchProfile(cb) { subs.profile.add(cb); cb({ ...DEFAULT_PROFILE, ...read(K.profile, {}) }); return () => subs.profile.delete(cb); },
    watchReviews(cb, { admin = false } = {}) {
      const s = { cb, admin }; subs.reviews.add(s);
      const list = all(); cb(admin ? list : list.filter((r) => !r.hidden));
      return () => subs.reviews.delete(s);
    },
    watchMyReview(cb) { subs.mine.add(cb); cb(read(K.reviews, {})[uid] || null); return () => subs.mine.delete(cb); },
    async saveMyReview(input) {
      const data = cleanReviewInput(input);
      mutate((map) => {
        const prev = map[uid];
        const now = Date.now();
        map[uid] = { ...data, id: uid, hidden: prev?.hidden || false, reply: prev?.reply || null, sample: false,
          createdAt: prev?.createdAt || now, updatedAt: now };
      });
    },
    async deleteMyReview() { mutate((map) => { delete map[uid]; }); },

    // Admin
    watchAdmin(cb) { subs.admin.add(cb); cb(read(K.admin, false) ? { email: ADMIN_EMAIL + " (demo)", isAdmin: true } : null); return () => subs.admin.delete(cb); },
    async signIn() { write(K.admin, true); subs.admin.forEach((cb) => cb({ email: ADMIN_EMAIL + " (demo)", isAdmin: true })); },
    async signOut() { write(K.admin, false); subs.admin.forEach((cb) => cb(null)); },
    async saveProfile(p) { write(K.profile, p); emit(); },
    async setHidden(id, hidden) { mutate((map) => { if (map[id]) map[id].hidden = hidden; }); },
    async setReply(id, text) { mutate((map) => { if (map[id]) map[id].reply = text ? { text, at: Date.now() } : null; }); },
    async deleteReview(id) { mutate((map) => { delete map[id]; }); },
    async addSamples() { mutate((map) => { for (const d of sampleDocs()) map[d.id] = d; }); },
    async removeSamples() { mutate((map) => { for (const id of Object.keys(map)) if (map[id].sample) delete map[id]; }); },
  };
}

/* ---------------- Firebase store ---------------- */

async function createFirebaseStore() {
  const V = "10.12.2";
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const ms = (t) => (t && typeof t.toMillis === "function" ? t.toMillis() : typeof t === "number" ? t : Date.now());
  const norm = (snap) => {
    const d = snap.data();
    return { ...d, id: snap.id, createdAt: ms(d.createdAt), updatedAt: ms(d.updatedAt),
      reply: d.reply ? { text: d.reply.text, at: ms(d.reply.at) } : null };
  };
  const isAdminUser = (u) => Boolean(u && !u.isAnonymous && u.emailVerified && u.email === ADMIN_EMAIL);
  const authReady = new Promise((res) => { const off = A.onAuthStateChanged(auth, (u) => { off(); res(u); }); });

  return {
    mode: "live",
    // Public visitors get an invisible anonymous session: it is what ties
    // a review to this browser (one review per browser, edit/delete own).
    async ready() {
      let u = await authReady;
      if (!u) u = (await A.signInAnonymously(auth)).user;
      return u.uid;
    },
    uid: () => auth.currentUser?.uid || null,
    watchProfile(cb) {
      return F.onSnapshot(F.doc(db, "profile", "main"),
        (s) => cb({ ...DEFAULT_PROFILE, ...(s.exists() ? s.data() : {}) }),
        () => cb({ ...DEFAULT_PROFILE }));
    },
    watchReviews(cb, { admin = false } = {}) {
      const col = F.collection(db, "reviews");
      const q = admin ? col : F.query(col, F.where("hidden", "==", false));
      return F.onSnapshot(q, (s) => cb(s.docs.map(norm)), (e) => { console.error(e); cb([]); });
    },
    watchMyReview(cb) {
      const uid = auth.currentUser?.uid;
      if (!uid) { cb(null); return () => {}; }
      return F.onSnapshot(F.doc(db, "reviews", uid), (s) => cb(s.exists() ? norm(s) : null), () => cb(null));
    },
    async saveMyReview(input) {
      const data = cleanReviewInput(input);
      const uid = auth.currentUser.uid;
      const ref = F.doc(db, "reviews", uid);
      const prev = await F.getDoc(ref).catch(() => null);
      if (prev && prev.exists()) {
        await F.updateDoc(ref, { ...data, updatedAt: F.serverTimestamp() });
      } else {
        await F.setDoc(ref, { ...data, hidden: false, reply: null, sample: false,
          createdAt: F.serverTimestamp(), updatedAt: F.serverTimestamp() });
      }
    },
    async deleteMyReview() { await F.deleteDoc(F.doc(db, "reviews", auth.currentUser.uid)); },

    // Admin
    watchAdmin(cb) {
      return A.onAuthStateChanged(auth, (u) => cb(u && !u.isAnonymous ? { email: u.email, isAdmin: isAdminUser(u) } : null));
    },
    async signIn() { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); },
    async signOut() { await A.signOut(auth); },
    async saveProfile(p) { await F.setDoc(F.doc(db, "profile", "main"), p); },
    async setHidden(id, hidden) { await F.updateDoc(F.doc(db, "reviews", id), { hidden }); },
    async setReply(id, text) {
      await F.updateDoc(F.doc(db, "reviews", id), { reply: text ? { text, at: F.serverTimestamp() } : null });
    },
    async deleteReview(id) { await F.deleteDoc(F.doc(db, "reviews", id)); },
    async addSamples() {
      const b = F.writeBatch(db);
      for (const d of sampleDocs()) {
        const { id, createdAt, updatedAt, ...rest } = d;
        b.set(F.doc(db, "reviews", id), { ...rest,
          createdAt: F.Timestamp.fromMillis(createdAt), updatedAt: F.Timestamp.fromMillis(updatedAt) });
      }
      await b.commit();
    },
    async removeSamples() {
      const s = await F.getDocs(F.query(F.collection(db, "reviews"), F.where("sample", "==", true)));
      const b = F.writeBatch(db);
      s.forEach((d) => b.delete(d.ref));
      await b.commit();
    },
  };
}

/* ---------------- Shared helpers ---------------- */

// Shrinks a picked image to a JPEG data URL small enough to live inside
// the review document (Firestore documents max out at 1 MiB).
export async function compressImage(file, { maxSide = 960, maxBytes = 200_000 } = {}) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be added.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That image could not be read.")); i.src = url; });
    let side = maxSide;
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      for (const q of [0.8, 0.7, 0.6, 0.5]) {
        const data = c.toDataURL("image/jpeg", q);
        if (data.length * 0.75 <= maxBytes) return data;
      }
      side = Math.round(side * 0.75);
    }
    throw new Error("That image is too large. Try a smaller one.");
  } finally { URL.revokeObjectURL(url); }
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function fmtDate(ms) {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function starsSVG(value, size = 16) {
  let out = "";
  for (let i = 1; i <= 5; i++) {
    const fill = Math.max(0, Math.min(1, value - (i - 1)));
    const id = "g" + Math.random().toString(36).slice(2, 8);
    out += `<svg class="star" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">` +
      `<defs><linearGradient id="${id}"><stop offset="${fill * 100}%" stop-color="var(--star)"/><stop offset="${fill * 100}%" stop-color="var(--star-off)"/></linearGradient></defs>` +
      `<path fill="url(#${id})" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>`;
  }
  return `<span class="stars" role="img" aria-label="${value.toFixed(1)} out of 5 stars">${out}</span>`;
}

export const LOGO_SYMBOL = `<svg class="symbol" viewBox="0 0 73 48" aria-hidden="true">
  <path d="M0 48h9l4.5-18h-9z" fill="currentColor" opacity=".28"/>
  <path d="M13 48h9l6.2-25h-9z" fill="currentColor" opacity=".46"/>
  <path d="M26 48h9l8-32h-9z" fill="currentColor" opacity=".64"/>
  <path d="M39 48h9l10-40h-9z" fill="currentColor" opacity=".84"/>
  <path d="M52 48h9l12-48h-9z" fill="var(--orange)"/>
</svg>`;
