import { createStore, CATEGORIES, LIMITS, DEFAULT_PROFILE, overallOf, compressImage, esc, fmtDate, starsSVG, LOGO_SYMBOL } from "./store.js";

const $ = (id) => document.getElementById(id);
$("logo").innerHTML = LOGO_SYMBOL;

let store;
let profile = { ...DEFAULT_PROFILE };
let profileDirty = false;
let unsubs = [];

let toastTimer;
function toast(text) {
  const t = $("toast");
  t.textContent = text; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}
const publicUrl = () => new URL("./", location.href).href;
$("copy-link").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(publicUrl()); toast("Public link copied"); }
  catch { toast(publicUrl()); }
});

/* ---------- Auth gate ---------- */
function showGate(text, error = "") {
  $("gate").hidden = false; $("app").hidden = true;
  if (text) $("gate-text").textContent = text;
  $("gate-msg").textContent = error;
}
function onAdmin(user) {
  unsubs.forEach((u) => u()); unsubs = [];
  $("who").textContent = user ? user.email : "";
  $("sign-out").hidden = !user;
  if (!user) return showGate("Sign in with the coach's Google account to edit the profile and moderate reviews.");
  if (!user.isAdmin) return showGate("This Google account can't manage this page.", `Signed in as ${user.email}. Sign out and use the coach's account.`);
  $("gate").hidden = true; $("app").hidden = false;
  unsubs.push(store.watchProfile((p) => { profile = p; if (!profileDirty) fillProfile(); }));
  unsubs.push(store.watchReviews(renderReviews, { admin: true }));
}
$("sign-in").addEventListener("click", async () => {
  $("gate-msg").textContent = "";
  try { await store.signIn(); }
  catch (err) { console.error(err); $("gate-msg").textContent = "Sign-in didn't complete. Allow pop-ups for this site and try again."; }
});
$("sign-out").addEventListener("click", () => store.signOut());

/* ---------- Profile ---------- */
const PF = { name: "pf-name", headline: "pf-headline", experienceYears: "pf-exp", levels: "pf-levels", languages: "pf-langs", price: "pf-price", email: "pf-email", bio: "pf-bio" };
let photo = "";
function fillProfile() {
  for (const [k, id] of Object.entries(PF)) $(id).value = profile[k] ?? "";
  photo = profile.photo || "";
  $("pf-photo-preview").src = photo || "marco.jpg";
}
$("profile-form").addEventListener("input", () => { profileDirty = true; });
$("pf-photo").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = "";
  if (!f) return;
  try { photo = await compressImage(f, { maxSide: 900, maxBytes: 280_000 }); $("pf-photo-preview").src = photo; profileDirty = true; }
  catch (err) { $("pf-msg").textContent = err.message; $("pf-msg").className = "msg error"; }
});
$("pf-photo-reset").addEventListener("click", () => { photo = ""; $("pf-photo-preview").src = "marco.jpg"; profileDirty = true; });
$("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const p = { photo };
  for (const [k, id] of Object.entries(PF)) p[k] = $(id).value.trim();
  p.experienceYears = Number(p.experienceYears) || 0;
  if (!p.name) { $("pf-msg").textContent = "Add a name."; $("pf-msg").className = "msg error"; return; }
  $("pf-save").disabled = true;
  try { await store.saveProfile(p); profileDirty = false; $("pf-msg").textContent = "Saved"; $("pf-msg").className = "msg ok"; toast("Profile saved"); }
  catch (err) { console.error(err); $("pf-msg").textContent = "Couldn't save the profile. Check your connection and try again."; $("pf-msg").className = "msg error"; }
  finally { $("pf-save").disabled = false; }
});

/* ---------- Moderation ---------- */
let reviews = [];
function renderReviews(list) {
  reviews = [...list].sort((a, b) => b.createdAt - a.createdAt);
  const shown = reviews.filter((r) => !r.hidden);
  const avg = shown.length ? shown.reduce((a, r) => a + overallOf(r), 0) / shown.length : 0;
  $("stats").innerHTML = `<span>${reviews.length} total</span><span>${shown.length} public</span><span>${reviews.length - shown.length} hidden</span><span>${reviews.filter((r) => r.sample).length} samples</span><span>Public average ${shown.length ? avg.toFixed(1) : "–"}</span>`;
  const box = $("mod-list");
  // Keep a reply that is being typed when another update arrives.
  const drafts = {};
  box.querySelectorAll("textarea[data-reply]").forEach((t) => { if (t.dataset.dirty) drafts[t.dataset.reply] = t.value; });
  if (!reviews.length) { box.innerHTML = `<div class="empty" style="margin-top:16px">No reviews yet.</div>`; return; }
  box.innerHTML = reviews.map((r) => {
    const o = overallOf(r);
    return `<div class="mod" data-id="${esc(r.id)}">
      <article class="review">
        <div class="avatar" aria-hidden="true">${esc(((r.firstName || "?")[0] + (r.lastName || "")[0]).toUpperCase())}</div>
        <div style="min-width:0">
          <div class="r-head"><span class="r-name">${esc(r.firstName)} ${esc(r.lastName)}</span><span class="r-country">${esc(r.country)}</span>
            ${r.sample ? `<span class="chip sample">Sample</span>` : ""}${r.hidden ? `<span class="chip hidden">Hidden</span>` : ""}</div>
          <div class="r-meta">${starsSVG(o, 15)}<span class="score">${o.toFixed(1)}</span><span>${fmtDate(r.createdAt)}</span></div>
          <p class="r-comment">${esc(r.comment)}</p>
          ${r.photos?.length ? `<div class="r-photos">${r.photos.map((s) => `<img src="${esc(s)}" alt="">`).join("")}</div>` : ""}
          <div class="r-cats" style="margin-top:8px">${CATEGORIES.map((c) => `<div><span>${esc(c.label)}</span><span class="mono">${r.ratings?.[c.key] ?? "–"} / 5</span></div>`).join("")}</div>
        </div>
      </article>
      <div class="mod-tools">
        <label class="sr-only" for="reply-${esc(r.id)}">Reply</label>
        <textarea class="input" id="reply-${esc(r.id)}" data-reply="${esc(r.id)}" rows="2" maxlength="${LIMITS.reply}" placeholder="Write a public reply">${esc(drafts[r.id] ?? r.reply?.text ?? "")}</textarea>
        <div class="row">
          <button class="btn btn-dark btn-small" data-act="reply" type="button">${r.reply ? "Update reply" : "Post reply"}</button>
          ${r.reply ? `<button class="btn btn-ghost btn-small" data-act="unreply" type="button">Remove reply</button>` : ""}
          <button class="btn btn-ghost btn-small" data-act="toggle" type="button">${r.hidden ? "Show on page" : "Hide from page"}</button>
          <button class="btn btn-danger btn-small" data-act="delete" type="button">Delete</button>
        </div>
      </div>
    </div>`;
  }).join("");
}
$("mod-list").addEventListener("input", (e) => { if (e.target.dataset.reply) e.target.dataset.dirty = "1"; });
$("mod-list").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const id = b.closest("[data-id]").dataset.id;
  const r = reviews.find((x) => x.id === id);
  b.disabled = true;
  try {
    if (b.dataset.act === "reply") {
      const text = b.closest(".mod").querySelector("textarea").value.trim();
      await store.setReply(id, text); toast(text ? "Reply posted" : "Reply removed");
    }
    if (b.dataset.act === "unreply") { await store.setReply(id, ""); toast("Reply removed"); }
    if (b.dataset.act === "toggle") { await store.setHidden(id, !r.hidden); toast(r.hidden ? "Review shown" : "Review hidden"); }
    if (b.dataset.act === "delete") {
      if (!confirm(`Delete the review from ${r.firstName} ${r.lastName}? This can't be undone.`)) return;
      await store.deleteReview(id); toast("Review deleted");
    }
  } catch (err) { console.error(err); toast("That didn't save. Check your connection and try again."); }
  finally { b.disabled = false; }
});
$("add-samples").addEventListener("click", async () => {
  try { await store.addSamples(); toast("Sample reviews added"); } catch (err) { console.error(err); toast("Couldn't add sample reviews."); }
});
$("remove-samples").addEventListener("click", async () => {
  if (!confirm("Delete all sample reviews?")) return;
  try { await store.removeSamples(); toast("Sample reviews deleted"); } catch (err) { console.error(err); toast("Couldn't delete sample reviews."); }
});

/* ---------- Boot ---------- */
(async () => {
  try {
    store = await createStore();
    if (store.mode === "demo") {
      $("demo-banner").hidden = false;
      $("sign-in").textContent = "Enter demo admin";
    }
    store.watchAdmin(onAdmin);
  } catch (err) {
    console.error(err);
    showGate("", "The admin page couldn't load. Check your connection and refresh.");
  }
})();
