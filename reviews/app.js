import { createStore, CATEGORIES, LIMITS, overallOf, compressImage, esc, fmtDate, starsSVG, LOGO_SYMBOL } from "./store.js";

const $ = (id) => document.getElementById(id);
const STAR_PATH = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z";
const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

const state = { reviews: [], mine: null, editing: false, ratings: {}, photos: [], sort: "newest", busy: false };
let store;

$("logo").innerHTML = LOGO_SYMBOL;

/* ---------- Toast & copy ---------- */
let toastTimer;
function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}
async function copy(text, done) {
  try { await navigator.clipboard.writeText(text); toast(done); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand("copy"); toast(done); } catch { toast("Copy this: " + text); }
    ta.remove();
  }
}
const pageUrl = () => location.origin + location.pathname;
$("copy-link").addEventListener("click", () => copy(pageUrl(), "Link copied"));
$("copy-email").addEventListener("click", () => copy($("p-email").textContent, "Email copied"));

/* ---------- Profile ---------- */
function renderProfile(p) {
  $("p-name").textContent = p.name;
  $("p-headline").textContent = p.headline;
  $("p-bio").textContent = p.bio;
  $("p-bio").hidden = !p.bio;
  $("p-email").textContent = p.email;
  $("p-photo").src = p.photo || "marco.jpg";
  document.querySelector(".lockup .nm").textContent = p.name;
  const facts = [
    ["Experience", p.experienceYears ? `${p.experienceYears} years` : ""],
    ["Levels", p.levels],
    ["Languages", p.languages],
    ["Price", p.price],
  ].filter(([, v]) => v);
  $("p-facts").innerHTML = facts.map(([k, v]) => `<li><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></li>`).join("");
}

/* ---------- Summary ---------- */
function renderSummary(list) {
  const n = list.length;
  const avg = n ? list.reduce((a, r) => a + overallOf(r), 0) / n : 0;
  $("avg").textContent = n ? avg.toFixed(1) : "–";
  $("avg-stars").innerHTML = starsSVG(avg, 20);
  $("avg-count").textContent = n ? `${n} review${n === 1 ? "" : "s"}` : "No reviews yet. Be the first.";
  $("foot-count").textContent = n ? `${avg.toFixed(1)} / 5 · ${n} review${n === 1 ? "" : "s"}` : "";

  const buckets = [0, 0, 0, 0, 0, 0];
  list.forEach((r) => buckets[Math.min(5, Math.max(1, Math.round(overallOf(r))))]++);
  const max = Math.max(1, ...buckets);
  $("dist").innerHTML = [5, 4, 3, 2, 1].map((s) =>
    `<div class="dist-row"><span>${s}</span><span class="track"><i style="width:${(buckets[s] / max) * 100}%"></i></span><span class="n">${buckets[s]}</span></div>`).join("");

  $("cats").innerHTML = CATEGORIES.map((c) => {
    const v = n ? list.reduce((a, r) => a + (Number(r.ratings?.[c.key]) || 0), 0) / n : 0;
    return `<div class="cat-row"><span class="lbl">${esc(c.label)}</span><span class="val">${n ? v.toFixed(1) : "–"}</span><span class="track steel"><i style="width:${(v / 5) * 100}%"></i></span></div>`;
  }).join("");
}

/* ---------- Reviews list ---------- */
function initials(r) { return ((r.firstName || "?")[0] + (r.lastName || "")[0] || "").toUpperCase(); }

function reviewHTML(r, { mine = false, actions = false } = {}) {
  const o = overallOf(r);
  const edited = r.updatedAt && r.createdAt && r.updatedAt - r.createdAt > 60000;
  return `<article class="review${mine ? " mine" : ""}" data-id="${esc(r.id)}">
    <div class="avatar" aria-hidden="true">${esc(initials(r))}</div>
    <div style="min-width:0">
      <div class="r-head">
        <span class="r-name">${esc(r.firstName)} ${esc(r.lastName)}</span>
        <span class="r-country">${esc(r.country)}</span>
        ${mine ? `<span class="chip you">Your review</span>` : ""}
        ${r.sample ? `<span class="chip sample">Sample</span>` : ""}
        ${r.hidden ? `<span class="chip hidden">Hidden by the coach</span>` : ""}
      </div>
      <div class="r-meta">${starsSVG(o, 16)}<span class="score">${o.toFixed(1)}</span><span>${fmtDate(r.createdAt)}${edited ? " · edited" : ""}</span></div>
      <p class="r-comment">${esc(r.comment)}</p>
      ${r.photos?.length ? `<div class="r-photos">${r.photos.map((src, i) => `<button type="button" data-photo="${i}" aria-label="Open photo ${i + 1}"><img src="${esc(src)}" alt="Photo ${i + 1} from ${esc(r.firstName)}" loading="lazy"></button>`).join("")}</div>` : ""}
      <details class="r-detail"><summary>Ratings by category</summary>
        <div class="r-cats">${CATEGORIES.map((c) => `<div><span>${esc(c.label)}</span><span class="mono">${r.ratings?.[c.key] ?? "–"} / 5</span></div>`).join("")}</div>
      </details>
      ${r.reply?.text ? `<div class="reply"><div class="eyebrow">Reply from the coach · ${fmtDate(r.reply.at)}</div><p>${esc(r.reply.text)}</p></div>` : ""}
      ${actions ? `<div class="r-actions"><button class="btn btn-dark btn-small" type="button" data-act="edit">Edit</button><button class="btn btn-danger btn-small" type="button" data-act="delete">Delete</button></div>` : ""}
    </div>
  </article>`;
}

function sorted(list) {
  const l = [...list];
  if (state.sort === "highest") l.sort((a, b) => overallOf(b) - overallOf(a) || b.createdAt - a.createdAt);
  else if (state.sort === "lowest") l.sort((a, b) => overallOf(a) - overallOf(b) || b.createdAt - a.createdAt);
  else l.sort((a, b) => b.createdAt - a.createdAt);
  return l;
}

function renderReviews() {
  const uid = store?.uid();
  const visible = state.reviews;
  renderSummary(visible);
  const others = sorted(visible.filter((r) => r.id !== uid));
  const box = $("reviews");
  if (!visible.length) { box.innerHTML = `<div class="empty">No reviews yet. Rate your lesson above and yours will appear here.</div>`; return; }
  const mine = visible.find((r) => r.id === uid);
  box.innerHTML = (mine ? reviewHTML(mine, { mine: true }) : "") + others.map((r) => reviewHTML(r)).join("");
}

$("sort").addEventListener("change", (e) => { state.sort = e.target.value; renderReviews(); });

/* ---------- Lightbox ---------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-photo]");
  if (!b) return;
  const id = b.closest("[data-id]").dataset.id;
  const r = state.reviews.find((x) => x.id === id) || (state.mine?.id === id ? state.mine : null);
  if (!r) return;
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `<img src="${esc(r.photos[+b.dataset.photo])}" alt="Review photo">`;
  lb.addEventListener("click", () => lb.remove());
  document.addEventListener("keydown", function k(ev) { if (ev.key === "Escape") { lb.remove(); document.removeEventListener("keydown", k); } });
  document.body.append(lb);
});

/* ---------- My review box ---------- */
let confirmDelete = false;
function renderMine() {
  const box = $("mine-box");
  const form = $("review-form");
  if (state.mine && !state.editing) {
    $("form-title").textContent = "Your review";
    box.innerHTML = `<div class="panel">${reviewHTML(state.mine, { mine: true, actions: true })}</div>`;
    form.hidden = true;
  } else {
    $("form-title").textContent = state.mine ? "Edit your review" : "Rate your lesson";
    box.innerHTML = "";
    form.hidden = false;
    $("f-submit").textContent = state.mine ? "Save changes" : "Post review";
    $("f-cancel").hidden = !state.mine;
  }
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || !store) return;
  if (b.dataset.act === "edit") { startEdit(); }
  if (b.dataset.act === "delete") {
    if (!confirmDelete) {
      confirmDelete = true;
      document.querySelectorAll('[data-act="delete"]').forEach((x) => (x.textContent = "Tap again to delete"));
      setTimeout(() => { confirmDelete = false; document.querySelectorAll('[data-act="delete"]').forEach((x) => (x.textContent = "Delete")); }, 4000);
      return;
    }
    confirmDelete = false;
    b.disabled = true;
    try { await store.deleteMyReview(); state.editing = false; resetForm(); toast("Review deleted"); }
    catch (err) { console.error(err); toast("Couldn't delete the review. Check your connection and try again."); b.disabled = false; }
  }
});

/* ---------- Form ---------- */
function starButtons(key) {
  return [1, 2, 3, 4, 5].map((n) =>
    `<button type="button" data-cat="${key}" data-val="${n}" aria-label="${n} star${n > 1 ? "s" : ""}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg></button>`).join("");
}
$("rate-grid").innerHTML = CATEGORIES.map((c) =>
  `<div class="rate-row"><span class="lbl" id="lbl-${c.key}">${esc(c.label)}</span>
    <span class="star-input" role="group" aria-labelledby="lbl-${c.key}">${starButtons(c.key)}<span class="hint" id="hint-${c.key}">–</span></span></div>`).join("");

function paintStars() {
  for (const c of CATEGORIES) {
    const v = state.ratings[c.key] || 0;
    document.querySelectorAll(`[data-cat="${c.key}"]`).forEach((b) => {
      const on = +b.dataset.val <= v;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(+b.dataset.val === v));
    });
    $("hint-" + c.key).textContent = RATING_WORDS[v] || "–";
  }
  const done = CATEGORIES.filter((c) => state.ratings[c.key]).length;
  const avg = done ? CATEGORIES.reduce((a, c) => a + (state.ratings[c.key] || 0), 0) / done : 0;
  $("overall-preview").innerHTML = done === CATEGORIES.length
    ? `Overall ${starsSVG(avg, 16)} <strong style="color:var(--black)">${avg.toFixed(1)}</strong>`
    : `${done} of ${CATEGORIES.length} categories rated`;
}
$("rate-grid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  state.ratings[b.dataset.cat] = +b.dataset.val;
  paintStars();
});
$("rate-grid").addEventListener("mouseover", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  document.querySelectorAll(`[data-cat="${b.dataset.cat}"]`).forEach((x) => x.classList.toggle("on", +x.dataset.val <= +b.dataset.val));
});
$("rate-grid").addEventListener("mouseleave", paintStars);

const comment = $("f-comment");
function updateCounter() {
  const n = comment.value.length;
  $("f-counter").textContent = `${n} / ${LIMITS.comment}`;
  $("f-counter").classList.toggle("full", n >= LIMITS.comment);
}
comment.addEventListener("input", updateCounter);

function renderPhotos() {
  const picker = $("photo-picker");
  picker.querySelectorAll(".thumb-wrap").forEach((n) => n.remove());
  state.photos.forEach((src, i) => {
    const w = document.createElement("span");
    w.className = "thumb-wrap";
    w.innerHTML = `<img class="thumb" src="${esc(src)}" alt="Selected photo ${i + 1}"><button type="button" aria-label="Remove photo ${i + 1}">×</button>`;
    w.querySelector("button").addEventListener("click", () => { state.photos.splice(i, 1); renderPhotos(); });
    picker.insertBefore(w, $("photo-add"));
  });
  $("photo-add").hidden = state.photos.length >= LIMITS.photos;
}
$("f-photos").addEventListener("change", async (e) => {
  const files = [...e.target.files].slice(0, LIMITS.photos - state.photos.length);
  e.target.value = "";
  for (const f of files) {
    try { state.photos.push(await compressImage(f)); }
    catch (err) { setMsg(err.message, "error"); }
  }
  renderPhotos();
});

function setMsg(text, kind = "") { const m = $("f-msg"); m.textContent = text; m.className = "msg " + kind; }

function resetForm() {
  $("review-form").reset();
  state.ratings = {}; state.photos = [];
  paintStars(); renderPhotos(); updateCounter(); setMsg("");
}

function startEdit() {
  const r = state.mine;
  if (!r) return;
  state.editing = true;
  $("f-first").value = r.firstName; $("f-last").value = r.lastName; $("f-country").value = r.country;
  comment.value = r.comment;
  state.ratings = { ...r.ratings }; state.photos = [...(r.photos || [])];
  paintStars(); renderPhotos(); updateCounter(); setMsg("");
  renderMine();
  $("rate").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("f-cancel").addEventListener("click", () => { state.editing = false; resetForm(); renderMine(); });

$("review-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (state.busy || !store) return;
  const missing = CATEGORIES.find((c) => !state.ratings[c.key]);
  if (missing) return setMsg(`Rate "${missing.label}" from 1 to 5 stars.`, "error");
  state.busy = true; $("f-submit").disabled = true; setMsg("Saving…");
  const wasEditing = Boolean(state.mine);
  try {
    await store.saveMyReview({
      firstName: $("f-first").value, lastName: $("f-last").value, country: $("f-country").value,
      comment: comment.value, ratings: state.ratings, photos: state.photos,
    });
    state.editing = false;
    resetForm();
    renderMine();
    toast(wasEditing ? "Review updated" : "Review posted. Thank you!");
  } catch (err) {
    console.error(err);
    const text = err?.code === "permission-denied"
      ? "Your review couldn't be saved. Check that every field is filled in and try again."
      : err?.message || "Your review couldn't be saved. Check your connection and try again.";
    setMsg(text, "error");
  } finally { state.busy = false; $("f-submit").disabled = false; }
});

/* ---------- Boot ---------- */
paintStars(); updateCounter(); renderPhotos();

(async () => {
  try {
    store = await createStore();
    if (store.mode === "demo") $("demo-banner").hidden = false;
    store.watchProfile(renderProfile);
    await store.ready();
    store.watchReviews((list) => { state.reviews = list; renderReviews(); });
    store.watchMyReview((r) => {
      state.mine = r;
      if (!r) state.editing = false;
      renderMine();
    });
  } catch (err) {
    console.error(err);
    $("reviews").innerHTML = `<div class="empty">Reviews couldn't load. Check your connection and refresh the page.</div>`;
    $("avg-count").textContent = "";
  }
})();
