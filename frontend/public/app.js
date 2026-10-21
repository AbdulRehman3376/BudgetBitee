(() => {
  "use strict";

  /* ---------- Config & helpers ---------- */
  const API_BASE = (window.BUDGETBITE_API_BASE || `http://${location.hostname || "127.0.0.1"}:8000`).replace(/\/+$/, "");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (v) => "Rs. " + (Number(v) || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
  const moneyR = (v) => "Rs. " + Math.round(Number(v) || 0).toLocaleString("en-PK");
  const icon = (name, cls = "") => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  const listeners = {};
  const on = (e, f) => (listeners[e] = listeners[e] || []).push(f);
  const emit = (e, p) => (listeners[e] || []).forEach((f) => { try { f(p); } catch (err) { console.error(err); } });

  /* ---------- Categories (inferred from the dish name) ---------- */
  const CATEGORIES = ["Daal & Roti", "Salan & Sabzi", "Chana & Beans", "Breakfast & Eggs", "Rice & Pulao", "Budget Meals", "Biryani", "Fast Food", "Snacks & Street Food", "Drinks"];
  const EMOJI = { "Daal & Roti": "🫓", "Salan & Sabzi": "🥘", "Chana & Beans": "🫘", "Breakfast & Eggs": "🍳", "Rice & Pulao": "🍚", "Budget Meals": "🍛", "Biryani": "🍲", "Fast Food": "🍔", "Snacks & Street Food": "🥙", "Drinks": "🥤", "Other": "🍽️" };
  const TINT = { "Daal & Roti": "#f7ebcf", "Salan & Sabzi": "#fadfd2", "Chana & Beans": "#efe0cc", "Breakfast & Eggs": "#fdf0c4", "Rice & Pulao": "#e9efdc", "Budget Meals": "#fbe2c8", "Biryani": "#f6dcc6", "Fast Food": "#fbd9d3", "Snacks & Street Food": "#e4ead0", "Drinks": "#d8ebef", "Other": "#eceee6" };
  const RULES = [
    ["Biryani", ["biryani", "biriyani"]],
    ["Budget Meals", ["thali", "meal", "lunch", "dinner", "plate", "combo", "deal"]],
    ["Breakfast & Eggs", ["anda", "egg", "omelette", "omelet", "paratha", "breakfast", "nashta", "halwa puri", "puri"]],
    ["Fast Food", ["shawarma", "fries", "burger", "pizza", "sandwich", "wrap", "nuggets", "wings", "tikka", "bbq", "zinger"]],
    ["Drinks", ["drink", "juice", "tea", "chai", "lassi", "coffee", "shake", "cola", "soda", "water", "milk", "doodh", "falooda"]],
    ["Snacks & Street Food", ["samosa", "pakora", "snack", "roll", "chaat", "pani puri", "gol gappa", "dahi bhalla"]],
    ["Chana & Beans", ["chana", "chole", "lobia", "beans", "rajma"]],
    ["Salan & Sabzi", ["sabzi", "salan", "curry", "karahi", "vegetable", "nihari", "haleem", "paye", "qeema", "kofta"]],
    ["Rice & Pulao", ["pulao", "rice", "chawal", "khichdi"]],
    ["Daal & Roti", ["daal", "dal", "roti", "chapati", "naan", "kulcha"]]
  ].map(([cat, words]) => [cat, new RegExp("\\b(?:" + words.join("|") + ")s?\\b", "i")]);
  function categoryOf(name = "", description = "") {
    for (const text of [name, description]) {
      for (const [cat, rx] of RULES) if (rx.test(text)) return cat;
    }
    return "Other";
  }

  /* ---------- API ---------- */
  function detailText(detail) {
    if (!detail) return "";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d) => `${(d.loc || []).slice(-1)[0] || "Field"}: ${d.msg}`).join(". ");
    return "";
  }
  async function request(method, path, body) {
    let res;
    try {
      res = await fetch(API_BASE + path, {
        method,
        headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (_) {
      throw new Error("Cannot reach the BudgetBite server. Make sure the backend is running.");
    }
    if (!res.ok) {
      let msg = `Request failed (${res.status}).`;
      try { msg = detailText((await res.json()).detail) || msg; } catch (_) { /* keep default */ }
      throw new Error(msg);
    }
    return res.status === 204 ? null : res.json();
  }

  /* ---------- Shared data ---------- */
  const data = { vendors: [], items: [], status: "loading", error: "" };
  async function loadData(silent = false) {
    if (!silent && !data.vendors.length) { data.status = "loading"; emit("data"); }
    try {
      const vendors = await request("GET", "/vendors");
      const menus = await Promise.all(vendors.map((v) => request("GET", `/vendors/${v.id}/menu`).catch(() => [])));
      const byId = new Map(vendors.map((v) => [v.id, v]));
      data.vendors = vendors;
      data.items = menus.flat()
        .map((it) => ({ ...it, _price: Number(it.price), _vendor: (byId.get(it.vendor_id) || {}).name || "Restaurant", _category: categoryOf(it.name, it.description) }))
        .filter((it) => Number.isFinite(it._price) && it._price >= 0);
      data.status = "ready";
      data.error = "";
    } catch (err) {
      if (!silent || !data.vendors.length) { data.status = "error"; data.error = err.message; }
    }
    emit("data");
  }

  /* ---------- Toast & sheet ---------- */
  let toastTimer;
  function toast(message, type = "") {
    const el = $("#toast");
    el.textContent = message;
    el.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = "toast"; }, 2800);
  }
  const sheetRoot = $("#sheetRoot");
  const sheetBody = $("#sheetBody");
  let sheetToken = 0;
  let sheetClose = null;
  let confirmResolve = null;
  function openSheet(html, opts = {}) {
    sheetToken++;
    sheetBody.innerHTML = html;
    sheetClose = opts.onClose || null;
    sheetRoot.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => sheetRoot.classList.add("is-open")));
    $("#sheet").scrollTop = 0;
    const focus = $("[autofocus]", sheetBody);
    if (focus) setTimeout(() => focus.focus(), 320);
  }
  function closeSheet() {
    if (sheetRoot.hidden) return;
    const cb = sheetClose; sheetClose = null;
    sheetRoot.classList.remove("is-open");
    const token = ++sheetToken;
    setTimeout(() => { if (token === sheetToken) { sheetRoot.hidden = true; sheetBody.innerHTML = ""; } }, 280);
    if (cb) cb();
  }
  function confirmSheet({ title, message, confirmLabel = "Confirm", danger = true }) {
    return new Promise((resolve) => {
      confirmResolve = resolve;
      openSheet(`
        <h2>${esc(title)}</h2>
        <p class="sheet-sub">${esc(message)}</p>
        <div class="sheet-actions">
          <button class="btn ghost" type="button" data-action="sheet-close">Cancel</button>
          <button class="btn ${danger ? "danger" : "primary"}" type="button" data-action="confirm-yes">${esc(confirmLabel)}</button>
        </div>`, { onClose: () => { if (confirmResolve) { const r = confirmResolve; confirmResolve = null; r(false); } } });
    });
  }

  /* ---------- Navigation ---------- */
  const TABS = ["home", "explore", "places", "budget", "diary"];
  let currentTab = "home";
  let vendorId = null;
  function route() {
    const [tab, arg] = location.hash.replace(/^#\/?/, "").split("/");
    const name = TABS.includes(tab) ? tab : "home";
    currentTab = name;
    $$(".screen").forEach((s) => s.classList.toggle("is-active", s.dataset.screen === name));
    $$(".tab").forEach((t) => { if (t.dataset.to === name) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); });
    vendorId = name === "places" && arg ? Number(arg) : null;
    syncVendorView();
    emit("screen", name);
  }
  const go = (to) => { location.hash = "#/" + to; };

  /* ---------- Shared UI pieces ---------- */
  const snap = () => (window.BB && BB.budget ? BB.budget.snapshot() : { hasBudget: false, perMeal: 0 });
  function statusTag(status) {
    if (status === "verified") return `<span class="tag verified">${icon("shield")}Verified</span>`;
    if (status === "unverified") return `<span class="tag unverified">Unverified</span>`;
    return `<span class="tag">Sample</span>`;
  }
  function fitBadge(it) {
    const s = snap();
    if (!s.hasBudget || !(s.perMeal > 0)) return "";
    return it._price <= s.perMeal ? `<span class="fit ok">Fits your budget</span>` : `<span class="fit over">Over meal budget</span>`;
  }
  const tile = (cat, cls = "") => `<span class="tile ${cls}" style="--tint:${TINT[cat] || TINT.Other}" aria-hidden="true">${EMOJI[cat] || EMOJI.Other}</span>`;
  function dishRow(it) {
    return `<button type="button" class="dish-row" data-action="open-dish" data-id="${it.id}">
      ${tile(it._category)}
      <span class="dish-main"><strong>${esc(it.name)}</strong><small>${esc(it._vendor)} · ${esc(it._category)}</small>${it.data_status === "verified" ? "" : statusTag(it.data_status)}</span>
      <span class="dish-side"><b>${money(it._price)}</b>${fitBadge(it)}</span>
    </button>`;
  }
  const PALETTE = ["#1f6b3d", "#b5542f", "#2f6f8f", "#7a4aa0", "#a8801c", "#9b3b55", "#3e6b64"];
  const colorFor = (id) => PALETTE[Math.abs(Number(id) || 0) % PALETTE.length];
  function vendorStats(v) {
    const items = data.items.filter((i) => i.vendor_id === v.id);
    return { count: items.length, min: items.length ? Math.min(...items.map((i) => i._price)) : null };
  }
  function vendorRow(v) {
    const st = vendorStats(v);
    return `<button type="button" class="vendor-row" data-action="open-vendor" data-id="${v.id}">
      <span class="avatar" style="background:${colorFor(v.id)}" aria-hidden="true">${esc((v.name || "?").trim().charAt(0).toUpperCase())}</span>
      <span class="dish-main"><strong>${esc(v.name)}</strong><small>${esc(v.area)} · ${st.count} ${st.count === 1 ? "dish" : "dishes"}${st.min !== null ? ` · from ${money(st.min)}` : ""}</small>${v.verification_status === "verified" ? "" : statusTag(v.verification_status)}</span>
      <span class="go">${icon("next")}</span>
    </button>`;
  }
  const skeleton = (n = 4) => Array.from({ length: n }, () => `<div class="skel skel-row"></div>`).join("");
  const errorState = () => `<div class="empty"><div class="ring">${icon("wifi-off")}</div><h3>Can't connect</h3><p>${esc(data.error || "The server is not responding.")}</p><button class="btn primary" type="button" data-action="retry">${icon("refresh")}Try again</button></div>`;
  const noVendorsState = () => `<div class="empty"><div class="ring">${icon("store")}</div><h3>No restaurants yet</h3><p>Add the first restaurant, then add its dishes with prices. Students will see them here.</p><button class="btn primary" type="button" data-action="add-vendor">${icon("plus")}Add restaurant</button></div>`;

  /* ---------- Home ---------- */
  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }
  function renderHome() {
    const s = snap();
    const ready = data.status === "ready";
    let hero;
    if (s.hasBudget) {
      const pct = s.foodBudget > 0 ? Math.min(100, (s.spentTotal / s.foodBudget) * 100) : 0;
      hero = `<section class="hero-card" aria-label="Budget summary">
        <div class="hero-row"><div><span class="lbl">Food money left</span><strong class="amt ${s.remaining < 0 ? "neg" : ""}">${moneyR(s.remaining)}</strong></div>
        <button class="hero-go" type="button" data-action="go" data-to="budget" aria-label="Open budget">${icon("next")}</button></div>
        <div class="bar ${s.remaining < 0 ? "over" : ""}"><i style="width:${pct}%"></i></div>
        <div class="hero-stats"><div><span>Daily target</span><b>${moneyR(s.dailyTarget)}</b></div><div><span>Per meal</span><b>${moneyR(s.perMeal)}</b></div><div><span>Spent today</span><b>${moneyR(s.todaySpent)}</b></div></div>
      </section>`;
    } else {
      hero = `<section class="hero-card"><div class="hero-empty"><div class="ring">${icon("wallet")}</div><div><h2>Set your food budget</h2><p>Know your daily and per-meal limit.</p></div></div>
        <button class="btn lime block" type="button" data-action="go" data-to="budget" style="margin-top:16px">Set up budget</button></section>`;
    }

    let body = "";
    if (data.status === "loading") body = `<div class="section">${skeleton(3)}</div>`;
    else if (data.status === "error" && !data.vendors.length) body = `<div class="section">${errorState()}</div>`;
    else if (!data.vendors.length) body = `<div class="section">${noVendorsState()}</div>`;
    else {
      const sorted = [...data.items].sort((a, b) => a._price - b._price);
      let pool = s.hasBudget && s.perMeal > 0 ? sorted.filter((i) => i._price <= s.perMeal) : sorted;
      let title = s.hasBudget && s.perMeal > 0 ? `Under ${moneyR(s.perMeal)} per meal` : "Budget-friendly picks";
      if (!pool.length && sorted.length) { pool = sorted; title = "Closest to your meal budget"; }
      pool = pool.slice(0, 8);
      if (pool.length) {
        body += `<div class="section"><div class="section-head"><h2>${esc(title)}</h2><button class="link" type="button" data-action="go" data-to="explore">See all</button></div>
          <div class="hscroll">${pool.map((it) => `<button type="button" class="hcard" data-action="open-dish" data-id="${it.id}">${tile(it._category)}<strong>${esc(it.name)}</strong><small>${esc(it._vendor)}</small><b>${money(it._price)}</b></button>`).join("")}</div></div>`;
        const present = CATEGORIES.filter((c) => data.items.some((i) => i._category === c));
        if (present.length) body += `<div class="section"><div class="section-head"><h2>Browse by category</h2></div>
          <div class="cats">${present.map((c) => `<button type="button" class="cat" data-action="pick-cat" data-cat="${esc(c)}">${tile(c)}<span>${esc(c)}</span></button>`).join("")}</div></div>`;
      } else {
        body += `<div class="section"><div class="empty"><div class="ring">${icon("utensils")}</div><h3>No dishes yet</h3><p>Open a restaurant and add its menu items.</p><button class="btn primary" type="button" data-action="add-dish">${icon("plus")}Add a dish</button></div></div>`;
      }
      body += `<div class="section"><div class="section-head"><h2>Restaurants</h2><button class="link" type="button" data-action="go" data-to="places">See all</button></div>
        <div class="stack">${data.vendors.slice(0, 3).map(vendorRow).join("")}</div></div>`;
    }
    $("#homeRoot").innerHTML = `<div class="home-top">
        <div class="brand-row"><div class="brand"><img src="./budgetbite-logo.svg" alt=""><div>Budget<span>Bite</span></div></div><span class="pilot"><i></i>UMT PILOT</span></div>
        <p class="greet">${greeting()}</p><h1>What are we eating today?</h1></div>
      <div class="home-body">${hero}${body}</div>`;
  }

  /* ---------- Explore ---------- */
  const ex = { q: "", budget: "", sort: "recommended", cat: "All" };
  const RANK = { verified: 0, unverified: 1, sample: 2 };
  function exploreItems(ignoreCat = false) {
    let items = [...data.items];
    const q = ex.q.trim().toLowerCase();
    if (q) items = items.filter((i) => `${i.name} ${i.description || ""} ${i._vendor} ${i._category}`.toLowerCase().includes(q));
    if (ex.budget !== "" && Number.isFinite(Number(ex.budget))) items = items.filter((i) => i._price <= Number(ex.budget));
    if (!ignoreCat && ex.cat !== "All") items = items.filter((i) => i._category === ex.cat);
    if (ex.sort === "price-asc") items.sort((a, b) => a._price - b._price);
    else if (ex.sort === "price-desc") items.sort((a, b) => b._price - a._price);
    else if (ex.sort === "name") items.sort((a, b) => a.name.localeCompare(b.name));
    else items.sort((a, b) => (RANK[a.data_status] ?? 2) - (RANK[b.data_status] ?? 2) || a._price - b._price);
    return items;
  }
  function renderExplore() {
    const list = $("#exploreList");
    const chips = $("#exploreChips");
    const count = $("#exploreCount");
    if (data.status === "loading") { list.innerHTML = skeleton(5); count.textContent = ""; chips.innerHTML = ""; return; }
    if (data.status === "error" && !data.items.length) { list.innerHTML = errorState(); count.textContent = ""; chips.innerHTML = ""; return; }
    if (!data.vendors.length) { list.innerHTML = noVendorsState(); count.textContent = ""; chips.innerHTML = ""; return; }
    const base = exploreItems(true);
    const counts = {};
    base.forEach((i) => { counts[i._category] = (counts[i._category] || 0) + 1; });
    const cats = [...CATEGORIES, "Other"].filter((c) => counts[c]);
    if (ex.cat !== "All" && !counts[ex.cat]) ex.cat = "All";
    chips.innerHTML = [`<button type="button" class="chip" data-action="set-cat" data-cat="All" aria-pressed="${ex.cat === "All"}">All <b>${base.length}</b></button>`]
      .concat(cats.map((c) => `<button type="button" class="chip" data-action="set-cat" data-cat="${esc(c)}" aria-pressed="${ex.cat === c}">${esc(c)} <b>${counts[c]}</b></button>`)).join("");
    const items = exploreItems();
    count.textContent = `${items.length} ${items.length === 1 ? "dish" : "dishes"}`;
    if (!data.items.length) {
      list.innerHTML = `<div class="empty"><div class="ring">${icon("utensils")}</div><h3>No dishes yet</h3><p>Add dishes to a restaurant and they will appear here.</p><button class="btn primary" type="button" data-action="add-dish">${icon("plus")}Add a dish</button></div>`;
    } else if (!items.length) {
      list.innerHTML = `<div class="empty"><div class="ring">${icon("search")}</div><h3>No matching dishes</h3><p>Try another search or raise your price limit.</p><button class="btn soft" type="button" data-action="clear-filters">Clear filters</button></div>`;
    } else list.innerHTML = `<div class="stack">${items.map(dishRow).join("")}</div>`;
  }

  /* ---------- Restaurants ---------- */
  let placesQuery = "";
  function renderPlaces() {
    const el = $("#placesList");
    if (data.status === "loading") { el.innerHTML = skeleton(4); return; }
    if (data.status === "error" && !data.vendors.length) { el.innerHTML = errorState(); return; }
    if (!data.vendors.length) { el.innerHTML = noVendorsState(); return; }
    const q = placesQuery.trim().toLowerCase();
    const list = data.vendors.filter((v) => !q || `${v.name} ${v.area} ${v.address || ""}`.toLowerCase().includes(q));
    el.innerHTML = list.length ? `<div class="stack" style="margin-top:10px">${list.map(vendorRow).join("")}</div>`
      : `<div class="empty" style="margin-top:10px"><div class="ring">${icon("search")}</div><h3>No restaurants found</h3><p>Check the spelling or add a new restaurant.</p></div>`;
  }
  const vendorView = $("#vendorView");
  function renderVendor(v) {
    const items = data.items.filter((i) => i.vendor_id === v.id).sort((a, b) => a.name.localeCompare(b.name));
    const st = vendorStats(v);
    vendorView.innerHTML = `
      <div class="push-bar"><button class="icon-btn" type="button" data-action="back-places" aria-label="Back">${icon("back")}</button>
        <button class="icon-btn" type="button" data-action="delete-vendor" data-id="${v.id}" aria-label="Delete restaurant">${icon("trash")}</button></div>
      <div class="scroll">
        <div class="vendor-hero"><span class="avatar" style="background:${colorFor(v.id)}" aria-hidden="true">${esc(v.name.trim().charAt(0).toUpperCase())}</span>
          <div><h1>${esc(v.name)}</h1><p>${esc(v.area)}</p>${statusTag(v.verification_status)}</div></div>
        <div class="stat-pair"><div><span>Dishes</span><b>${st.count}</b></div><div><span>Starting from</span><b>${st.min !== null ? money(st.min) : "—"}</b></div></div>
        ${(v.address || v.contact_phone || v.description) ? `<div class="card"><div class="info-list">
          ${v.address ? `<div class="info-row">${icon("pin")}<div><small>Address</small>${esc(v.address)}</div></div>` : ""}
          ${v.contact_phone ? `<div class="info-row">${icon("phone")}<div><small>Phone</small><a href="tel:${esc(v.contact_phone.replace(/[^+\d]/g, ""))}">${esc(v.contact_phone)}</a></div></div>` : ""}
          ${v.description ? `<div class="info-row">${icon("store")}<div><small>About</small>${esc(v.description)}</div></div>` : ""}
        </div></div>` : ""}
        <div class="section"><div class="section-head"><h2>Menu</h2><button class="btn sm lime" type="button" data-action="add-dish" data-vendor="${v.id}">${icon("plus")}Add dish</button></div>
          ${items.length ? `<div class="stack">${items.map(dishRow).join("")}</div>` : `<div class="empty"><div class="ring">${icon("utensils")}</div><h3>Menu is empty</h3><p>Add the dishes this restaurant serves, with prices.</p></div>`}
        </div>
      </div>`;
  }
  function syncVendorView() {
    if (vendorId === null) {
      if (!vendorView.hidden) { vendorView.classList.remove("is-open"); setTimeout(() => { if (vendorId === null) vendorView.hidden = true; }, 300); }
      return;
    }
    const v = data.vendors.find((x) => x.id === vendorId);
    if (!v) {
      if (data.status !== "loading") { vendorId = null; go("places"); }
      return;
    }
    renderVendor(v);
    if (vendorView.hidden) { vendorView.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => vendorView.classList.add("is-open"))); }
    else vendorView.classList.add("is-open");
  }

  /* ---------- Sheets: dish detail & forms ---------- */
  function openDish(id) {
    const it = data.items.find((x) => x.id === Number(id));
    if (!it) return;
    const s = snap();
    const checked = it.price_checked_at ? `Price checked ${new Date(it.price_checked_at).toLocaleDateString("en-GB")}` : "Price not independently checked";
    openSheet(`
      <div class="dish-hero">${tile(it._category)}<div><h2>${esc(it.name)}</h2><p>${esc(it._vendor)}</p></div></div>
      <div class="price-big">${money(it._price)}</div>
      <div class="meta"><span class="tag">${esc(it._category)}</span>${statusTag(it.data_status)}${s.hasBudget && s.perMeal > 0 ? (it._price <= s.perMeal ? `<span class="fit ok">Fits your meal budget</span>` : `<span class="fit over">Over your meal budget</span>`) : ""}</div>
      ${it.description ? `<p class="desc">${esc(it.description)}</p>` : ""}
      <p class="hint" style="margin-bottom:18px">${esc(checked)}. ${it.is_available === true ? "Reported available." : it.is_available === false ? "Reported unavailable." : "Availability not confirmed."}</p>
      <div class="stack">
        <button class="btn primary block" type="button" data-action="add-to-diary" data-id="${it.id}">${icon("plus")}Add to today's diary</button>
        <div class="sheet-actions"><button class="btn ghost" type="button" data-action="open-vendor" data-id="${it.vendor_id}">${icon("store")}Restaurant</button>
        <button class="btn danger" type="button" data-action="delete-dish" data-id="${it.id}">${icon("trash")}Delete</button></div>
      </div>`);
  }
  const statusSeg = (name, value) => `<div class="seg" role="radiogroup" aria-label="Data status">
    ${[["sample", "Sample"], ["unverified", "Unverified"], ["verified", "Verified"]].map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${v === value ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>`;
  function openVendorForm() {
    openSheet(`<h2>Add restaurant</h2><p class="sheet-sub">Add a place where students can eat. You can add its menu next.</p>
      <form data-form="vendor" novalidate>
        <label class="field"><span>Restaurant name</span><input name="name" maxlength="150" autocomplete="off" placeholder="e.g. Hot &amp; Spicy Cafe" autofocus></label>
        <label class="field"><span>Area</span><input name="area" maxlength="120" value="UMT, Johar Town"></label>
        <label class="field"><span>Address <i>optional</i></span><input name="address" maxlength="300" autocomplete="off"></label>
        <label class="field"><span>Phone <i>optional</i></span><input name="contact_phone" type="tel" inputmode="tel" maxlength="30"></label>
        <label class="field"><span>Description <i>optional</i></span><textarea name="description" rows="2" maxlength="5000"></textarea></label>
        <div class="field"><span>Data status</span>${statusSeg("verification_status", "unverified")}<small class="hint">Use “Verified” only after checking the details in person.</small></div>
        <p class="form-error" hidden></p>
        <button class="btn primary block" type="submit">Save restaurant</button>
      </form>`);
  }
  function openDishForm(preVendor) {
    if (!data.vendors.length) { toast("Add a restaurant first.", "error"); openVendorForm(); return; }
    const opts = data.vendors.map((v) => `<option value="${v.id}" ${Number(preVendor) === v.id ? "selected" : ""}>${esc(v.name)}</option>`).join("");
    openSheet(`<h2>Add dish</h2><p class="sheet-sub">Enter the dish name and its current price.</p>
      <form data-form="dish" novalidate>
        <label class="field"><span>Restaurant</span><select name="vendor_id">${opts}</select></label>
        <label class="field"><span>Dish name</span><input name="name" maxlength="150" autocomplete="off" placeholder="e.g. Daal + roti" data-live="cat" autofocus></label>
        <div class="field" style="margin-top:-6px"><span class="live-cat" id="liveCat">${EMOJI.Other} Other</span></div>
        <label class="field"><span>Price (PKR)</span><input name="price" type="number" inputmode="decimal" min="0" step="any" placeholder="e.g. 120"></label>
        <label class="field"><span>Description <i>optional</i></span><textarea name="description" rows="2" maxlength="5000"></textarea></label>
        <div class="field"><span>Data status</span>${statusSeg("data_status", "unverified")}</div>
        <p class="form-error" hidden></p>
        <button class="btn primary block" type="submit">Save dish</button>
      </form>`);
  }
  async function submitForm(form) {
    const kind = form.dataset.form;
    const fd = new FormData(form);
    const val = (k) => String(fd.get(k) ?? "").trim();
    const err = $(".form-error", form);
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    let path, payload;
    if (kind === "vendor") {
      if (!val("name")) return fail("Please enter the restaurant name.");
      path = "/vendors";
      payload = { name: val("name"), area: val("area") || "UMT, Johar Town", address: val("address") || null, contact_phone: val("contact_phone") || null, description: val("description") || null, verification_status: val("verification_status") || "unverified" };
    } else {
      const price = Number(val("price"));
      if (!val("name")) return fail("Please enter the dish name.");
      if (val("price") === "" || !Number.isFinite(price) || price < 0) return fail("Please enter a valid price (0 or more).");
      if (price > 99999999) return fail("That price is too large.");
      const vid = Number(val("vendor_id"));
      path = `/vendors/${vid}/menu`;
      payload = { vendor_id: vid, name: val("name"), description: val("description") || null, price: price.toFixed(2), currency: "PKR", data_status: val("data_status") || "unverified" };
    }
    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    try {
      const created = await request("POST", path, payload);
      closeSheet();
      toast(kind === "vendor" ? "Restaurant added" : "Dish added", "success");
      await loadData(true);
      if (kind === "vendor" && created) go(`places/${created.id}`);
    } catch (e) { fail(e.message); btn.disabled = false; }
  }

  /* ---------- Actions ---------- */
  const actions = {
    go: (el) => { if (el.dataset.to === currentTab && !vendorId) { const s = $(".screen.is-active .scroll"); if (s) s.scrollTo({ top: 0, behavior: "smooth" }); } closeSheet(); go(el.dataset.to); },
    retry: () => loadData(),
    "sheet-close": () => closeSheet(),
    "confirm-yes": () => { const r = confirmResolve; confirmResolve = null; sheetClose = null; closeSheet(); if (r) r(true); },
    "open-dish": (el) => openDish(el.dataset.id),
    "open-vendor": (el) => { closeSheet(); go(`places/${el.dataset.id}`); },
    "back-places": () => go("places"),
    "pick-cat": (el) => { ex.cat = el.dataset.cat; renderExplore(); go("explore"); },
    "set-cat": (el) => { ex.cat = el.dataset.cat; renderExplore(); },
    "clear-filters": () => { Object.assign(ex, { q: "", budget: "", sort: "recommended", cat: "All" }); $("#exploreSearch").value = ""; $("#exploreBudget").value = ""; $("#exploreSort").value = "recommended"; renderExplore(); },
    "add-vendor": () => openVendorForm(),
    "add-dish": (el) => openDishForm(el.dataset.vendor || (vendorId || "")),
    "add-to-diary": (el) => {
      const it = data.items.find((x) => x.id === Number(el.dataset.id));
      if (it && BB.budget) { BB.budget.addMeal({ name: it.name, price: it._price, vendor: it._vendor, category: it._category }); closeSheet(); toast("Added to today's diary", "success"); }
    },
    "delete-dish": async (el) => {
      const it = data.items.find((x) => x.id === Number(el.dataset.id));
      if (!it) return;
      if (!(await confirmSheet({ title: "Delete this dish?", message: `“${it.name}” will be removed from ${it._vendor}'s menu.`, confirmLabel: "Delete" }))) return;
      try { await request("DELETE", `/menu-items/${it.id}`); toast("Dish deleted", "success"); await loadData(true); } catch (e) { toast(e.message, "error"); }
    },
    "delete-vendor": async (el) => {
      const v = data.vendors.find((x) => x.id === Number(el.dataset.id));
      if (!v) return;
      if (!(await confirmSheet({ title: "Delete this restaurant?", message: `“${v.name}” and all of its dishes will be removed.`, confirmLabel: "Delete" }))) return;
      try { await request("DELETE", `/vendors/${v.id}`); toast("Restaurant deleted", "success"); vendorId = null; go("places"); await loadData(true); } catch (e) { toast(e.message, "error"); }
    }
  };
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const fn = actions[el.dataset.action] || (window.BB && BB.actions && BB.actions[el.dataset.action]);
    if (fn) fn(el, e);
  });
  document.addEventListener("submit", (e) => {
    const form = e.target.closest("form[data-form]");
    if (!form) return;
    e.preventDefault();
    const handler = form.dataset.form === "vendor" || form.dataset.form === "dish" ? submitForm : (BB.forms || {})[form.dataset.form];
    if (handler) handler(form);
  });
  document.addEventListener("input", (e) => {
    if (e.target.dataset && e.target.dataset.live === "cat") {
      const c = categoryOf(e.target.value);
      const el = $("#liveCat");
      if (el) el.textContent = `${EMOJI[c] || EMOJI.Other} ${c}`;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  $("#exploreSearch").addEventListener("input", (e) => { ex.q = e.target.value; renderExplore(); });
  $("#exploreBudget").addEventListener("input", (e) => { ex.budget = e.target.value; renderExplore(); });
  $("#exploreSort").addEventListener("change", (e) => { ex.sort = e.target.value; renderExplore(); });
  $("#placesSearch").addEventListener("input", (e) => { placesQuery = e.target.value; renderPlaces(); });

  /* ---------- Public API for budget.js ---------- */
  window.BB = Object.assign(window.BB || {}, { API_BASE, $, $$, esc, money, moneyR, icon, on, emit, data, request, toast, openSheet, closeSheet, confirmSheet, tile, categoryOf, EMOJI, TINT, CATEGORIES, go, actions: {}, forms: {}, statusTag, dishRow });

  /* ---------- Boot ---------- */
  on("data", () => { renderHome(); renderExplore(); renderPlaces(); syncVendorView(); });
  on("budget", () => { renderHome(); renderExplore(); });
  window.addEventListener("hashchange", route);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loadData(true); });
  renderHome();
  route();
  loadData();
  setTimeout(() => {
    const splash = $("#splash");
    splash.classList.add("is-hidden");
    setTimeout(() => splash.remove(), 450);
  }, 1900);
})();