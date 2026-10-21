(() => {
  "use strict";
  const BB = window.BB;
  if (!BB) return;
  const { $, esc, moneyR, icon, request, toast, openSheet, closeSheet, confirmSheet, tile, categoryOf } = BB;

  /* ---------- Profile & storage (same keys as before, so saved data is kept) ---------- */
  const PROFILE_KEY = "budgetbite_profile_id_v1";
  const PROFILE = (() => {
    let id = localStorage.getItem(PROFILE_KEY);
    if (!id) {
      id = window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : `student-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(PROFILE_KEY, id);
    }
    return id;
  })();
  const STORE_KEY = `budgetbite_budget_fallback_v3_${PROFILE}`;
  const FIXED = ["Room rent", "Electricity", "Water", "Internet", "Transport", "Study expenses", "Other essentials"];
  const today = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const defaultState = () => ({ month: dateKey(today).slice(0, 7), startBudget: null, addedFunds: 0, mealsPerDay: 3, fixed: {}, records: {}, budgetLocked: false });
  let state = defaultState();
  let selectedDate = dateKey(today);
  let apiOnline = false;
  let loaded = false;
  const n = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);

  /* ---------- Calculations ---------- */
  const totalAvailable = () => n(state.startBudget) + n(state.addedFunds);
  const fixedTotal = () => FIXED.reduce((s, c) => s + n(state.fixed[c]), 0);
  const foodBudget = () => Math.max(0, totalAvailable() - fixedTotal());
  const dailyTarget = () => foodBudget() / 30;
  const perMeal = () => dailyTarget() / Math.max(1, n(state.mealsPerDay) || 1);
  const recordsTotal = () => Object.values(state.records).reduce((s, r) => s + n(r.spent), 0);
  const remaining = () => foodBudget() - recordsTotal();
  const blank = () => ({ spent: 0, ate: false, items: [], meals: [], note: "", time: "" });
  const rec = (key = selectedDate) => state.records[key] || blank();
  function ensureRecord(key = selectedDate) {
    if (!state.records[key]) state.records[key] = blank();
    const r = state.records[key];
    if (!Array.isArray(r.meals)) r.meals = [];
    if (!Array.isArray(r.items)) r.items = [];
    return r;
  }
  const snapshot = () => ({
    hasBudget: Boolean(state.budgetLocked && n(state.startBudget) > 0),
    foodBudget: foodBudget(), remaining: remaining(), spentTotal: recordsTotal(),
    dailyTarget: dailyTarget(), perMeal: perMeal(), todaySpent: n((state.records[dateKey(new Date())] || {}).spent)
  });

  /* ---------- Persistence ---------- */
  let saveTimer = null;
  async function load() {
    try {
      const res = await fetch(`${BB.API_BASE}/budget/${PROFILE}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("API unavailable");
      const d = await res.json();
      if (d.payload && typeof d.payload === "object") state = { ...defaultState(), ...d.payload };
      apiOnline = true;
    } catch (_) {
      try { state = { ...defaultState(), ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") }; } catch (__) { /* keep defaults */ }
      apiOnline = false;
    }
    loaded = true;
    renderAll();
    scheduleReminder();
  }
  async function persist(rerender = true) {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    try {
      const res = await fetch(`${BB.API_BASE}/budget/${PROFILE}`, { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ payload: state }) });
      if (!res.ok) throw new Error("Save failed");
      apiOnline = true;
    } catch (_) { apiOnline = false; }
    if (rerender) renderAll(); else { BB.emit("budget"); updateSync(); }
  }
  const saveDraft = () => localStorage.setItem(STORE_KEY, JSON.stringify(state));
  function persistSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => { await persist(false); const el = $("#savedNote"); if (el) el.textContent = apiOnline ? "Saved" : "Saved on this device"; }, 350);
  }
  function updateSync() {
    const el = $("#syncPill");
    if (!el) return;
    el.className = `sync ${apiOnline ? "online" : "offline"}`;
    el.textContent = apiOnline ? "Synced" : "Saved on this device";
  }

  /* ---------- Budget screen ---------- */
  function renderBudget() {
    const root = $("#budgetRoot");
    const locked = state.budgetLocked;
    const spentPct = foodBudget() > 0 ? Math.min(100, (recordsTotal() / foodBudget()) * 100) : 0;
    const notifOn = "Notification" in window && Notification.permission === "granted";
    root.innerHTML = `
      <header class="screen-head" style="padding-left:0;padding-right:0">
        <div><p class="eyebrow">Student money planner</p><h1>Budget</h1></div>
        <span class="sync ${apiOnline ? "online" : "offline"}" id="syncPill">${apiOnline ? "Synced" : "Saved on this device"}</span>
      </header>
      <section class="card overview">
        <span class="lbl">Food money left</span>
        <strong class="amt ${remaining() < 0 ? "neg" : ""}">${moneyR(remaining())}</strong>
        <div class="bar ${remaining() < 0 ? "over" : ""}"><i style="width:${spentPct}%"></i></div>
        <div class="ov-grid">
          <div><span>Total available</span><b>${moneyR(totalAvailable())}</b></div>
          <div><span>Essentials</span><b>${moneyR(fixedTotal())}</b></div>
          <div><span>Food budget</span><b>${moneyR(foodBudget())}</b></div>
          <div><span>Spent on food</span><b>${moneyR(recordsTotal())}</b></div>
        </div>
      </section>

      <section class="card">
        <h2>Monthly plan</h2>
        <p class="sub">Your starting budget is locked once saved. You can add money later.</p>
        <div class="row"><span>Starting budget<small>PKR</small></span>
          <input id="bStart" type="number" inputmode="numeric" min="1" step="100" placeholder="15000" value="${state.startBudget === null ? "" : n(state.startBudget)}" ${locked ? "disabled" : ""} aria-label="Starting budget in rupees"></div>
        <div class="row" style="flex-direction:column;align-items:stretch"><span>Meals per day</span>
          <div class="seg" style="margin-top:8px">${[1, 2, 3].map((v) => `<button type="button" data-action="b-meals" data-v="${v}" aria-pressed="${Number(state.mealsPerDay) === v}" ${locked ? "disabled" : ""}>${v} meal${v > 1 ? "s" : ""}</button>`).join("")}</div></div>
        <div class="row"><span>Added funds<small>Extra money you received</small></span><b>${moneyR(state.addedFunds)}</b></div>
        <button class="btn soft block" type="button" data-action="b-add-funds" style="margin-top:10px">${icon("plus")}Add funds</button>
        <div class="mini-stats"><div><span>Daily food target</span><b>${moneyR(dailyTarget())}</b></div><div><span>Per meal</span><b>${moneyR(perMeal())}</b></div></div>
        <h3>Essential monthly expenses</h3>
        ${FIXED.map((c) => `<div class="row"><span>${esc(c)}</span><input type="number" inputmode="numeric" min="0" step="50" data-fixed="${esc(c)}" value="${n(state.fixed[c]) || ""}" placeholder="0" aria-label="${esc(c)} in rupees"></div>`).join("")}
        <button class="btn primary block" type="button" data-action="b-save" style="margin-top:16px">${locked ? "Save expense changes" : "Save and lock starting budget"}</button>
        ${locked ? `<div class="lock-note">${icon("lock")}<span>Starting budget is locked. Use “Add funds” to increase your available amount.</span></div>` : ""}
      </section>

      <section class="card">
        <h2>Expense receipt</h2>
        <p class="sub">A summary of where your money stands.</p>
        <div class="row"><span>Starting budget</span><b>${moneyR(state.startBudget)}</b></div>
        <div class="row"><span>Additional funds</span><b>${moneyR(state.addedFunds)}</b></div>
        <div class="row"><span>Essential expenses</span><b>${moneyR(fixedTotal())}</b></div>
        <div class="row"><span>Recorded food spending</span><b>${moneyR(recordsTotal())}</b></div>
        <div class="row total"><span>Remaining balance</span><b>${moneyR(remaining())}</b></div>
      </section>

      <section class="card" style="padding-top:6px;padding-bottom:6px">
        <button class="row-btn" type="button" data-action="b-export"><span class="ico">${icon("download")}</span><span style="flex:1">Export expense history<small>Download as CSV (opens in Excel)</small></span></button>
        <button class="row-btn" type="button" data-action="b-reminder"><span class="ico">${icon("bell")}</span><span style="flex:1">${notifOn ? "9:00 PM reminder is on" : "Enable 9:00 PM reminder"}<small>Works while the app is open in your browser</small></span></button>
        <button class="row-btn danger" type="button" data-action="b-reset"><span class="ico">${icon("trash")}</span><span style="flex:1">Reset budget<small>Clears your budget and all daily records</small></span></button>
      </section>
      <p class="fine-print">Daily target uses a 30-day planning month. Prices elsewhere in the app come from restaurant listings.</p>`;
  }

  /* ---------- Diary screen ---------- */
  function renderDiary() {
    const root = $("#diaryRoot");
    const [y, m] = state.month.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const days = new Date(y, m, 0).getDate();
    const lead = first.getDay();
    const target = dailyTarget();
    const cells = Array.from({ length: lead }, () => `<span class="day empty-cell"></span>`)
      .concat(Array.from({ length: days }, (_, i) => {
        const key = `${y}-${pad(m)}-${pad(i + 1)}`;
        const r = state.records[key];
        const over = r && target > 0 && n(r.spent) > target;
        const cls = ["day", key === dateKey(today) ? "today" : "", key === selectedDate ? "selected" : "", r ? "has" : "", over ? "over" : ""].join(" ");
        return `<button type="button" class="${cls}" data-action="b-day" data-date="${key}" aria-label="${key}${r ? `, spent ${moneyR(r.spent)}` : ""}" aria-pressed="${key === selectedDate}">${i + 1}${r ? "<i></i>" : ""}</button>`;
      })).join("");
    const r = rec();
    const sel = new Date(selectedDate + "T00:00:00");
    const spent = n(r.spent);
    let delta = "";
    if (target > 0 && state.budgetLocked) delta = spent > target ? `<span class="delta over">${moneyR(spent - target)} over your daily target</span>` : `<span class="delta ok">${moneyR(target - spent)} under your daily target</span>`;
    const meals = (r.meals || []).map((meal, idx) => {
      const cat = meal.category || categoryOf(meal.name);
      return `<div class="meal">${tile(cat)}<div class="meal-main"><strong>${esc(meal.name)}</strong><small>${esc(meal.vendor || "Other expense")}</small></div><b>${moneyR(meal.price)}</b>
        <button class="x" type="button" data-action="b-remove-meal" data-i="${idx}" aria-label="Remove ${esc(meal.name)}">${icon("close")}</button></div>`;
    }).join("");
    const legacy = !(r.meals || []).length && (r.items || []).length ? `<p class="hint" style="margin-bottom:6px">Meals noted: ${esc(r.items.join(", "))}</p>` : "";
    root.innerHTML = `
      <header class="screen-head" style="padding-left:0;padding-right:0">
        <div><p class="eyebrow">Daily tracker</p><h1>Diary</h1></div>
        <div class="month-nav"><button type="button" data-action="b-month" data-d="-1" aria-label="Previous month">${icon("back")}</button><strong>${first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong><button type="button" data-action="b-month" data-d="1" aria-label="Next month">${icon("next")}</button></div>
      </header>
      <section class="card"><div class="cal">${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<span class="wd">${d}</span>`).join("")}${cells}</div>
        <div class="legend"><span>Within target</span><span class="o">Over target</span></div></section>
      <section class="card">
        <div class="day-head"><h2>${sel.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</h2>${selectedDate === dateKey(new Date()) ? `<span class="tag verified">Today</span>` : ""}</div>
        <div class="day-total">${moneyR(spent)}</div>${delta}
        <div class="btn-pair"><button class="btn primary" type="button" data-action="b-add-meal">${icon("plus")}Add meal</button><button class="btn ghost" type="button" data-action="b-add-other">Other expense</button></div>
        ${legacy}${meals || (legacy ? "" : `<p class="hint" style="text-align:center;padding:6px 0 12px">No meals added for this day yet.</p>`)}
        <div class="field" style="margin-top:14px"><span>Total spent on food (PKR)</span><input id="dSpent" type="number" inputmode="decimal" min="0" step="10" value="${spent || ""}" placeholder="0"></div>
        <div class="field"><span>Note <i>optional</i></span><input id="dNote" maxlength="300" value="${esc(r.note || "")}" placeholder="e.g. breakfast and dinner"></div>
        <div class="switch-row"><span>I ate today</span><label class="switch"><input id="dAte" type="checkbox" ${r.ate ? "checked" : ""} aria-label="I ate today"><span></span></label></div>
        <p class="saved" id="savedNote"></p>
      </section>`;
  }

  /* ---------- Rendering ---------- */
  function renderAll() {
    renderBudget();
    renderDiary();
    BB.emit("budget");
  }

  /* ---------- Diary mutations ---------- */
  function addMeal(meal) {
    const r = ensureRecord(dateKey(new Date()));
    selectedDate = dateKey(new Date());
    state.month = selectedDate.slice(0, 7);
    r.meals.push({ name: meal.name, price: n(meal.price), vendor: meal.vendor || "", category: meal.category || "" });
    r.items = r.meals.map((x) => x.name);
    r.spent = n(r.spent) + n(meal.price);
    r.ate = true;
    r.time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    persist();
  }
  function openMealPicker() {
    const items = [...BB.data.items].sort((a, b) => a._price - b._price);
    if (!items.length) {
      openSheet(`<h2>No dishes available</h2><p class="sheet-sub">Add restaurants and dishes first, then you can pick meals here. You can also add an “Other expense”.</p>
        <div class="sheet-actions"><button class="btn ghost" type="button" data-action="b-add-other">Other expense</button><button class="btn primary" type="button" data-action="go" data-to="places">Add restaurant</button></div>`);
      return;
    }
    openSheet(`<h2>Add a meal</h2><p class="sheet-sub">Choose what you ate. The price is added to your day.</p>
      <label class="search" style="height:48px"><svg class="i"><use href="#i-search"/></svg><input id="pickSearch" type="search" placeholder="Search dishes" autocomplete="off"></label>
      <div class="picker-list" id="pickList"></div>`);
    const draw = () => {
      const q = ($("#pickSearch").value || "").trim().toLowerCase();
      const list = items.filter((i) => !q || `${i.name} ${i._vendor}`.toLowerCase().includes(q));
      $("#pickList").innerHTML = list.length ? list.map((i) => `<button type="button" class="pick-row" data-action="b-pick" data-id="${i.id}">${tile(i._category)}<span class="dish-main"><strong>${esc(i.name)}</strong><small>${esc(i._vendor)}</small></span><span class="dish-side"><b>${BB.money(i._price)}</b></span></button>`).join("") : `<p class="hint" style="text-align:center;padding:18px 0">No dishes match your search.</p>`;
    };
    $("#pickSearch").addEventListener("input", draw);
    draw();
  }

  /* ---------- Actions ---------- */
  Object.assign(BB.actions, {
    "b-meals": (el) => { if (!state.budgetLocked) { state.mealsPerDay = Number(el.dataset.v); saveDraft(); renderBudget(); } },
    "b-save": async () => {
      if (!state.budgetLocked) {
        const start = $("#bStart");
        if (n(start.value) <= 0) { start.focus(); toast("Enter a starting budget greater than zero.", "error"); return; }
        state.startBudget = n(start.value);
        state.budgetLocked = true;
      }
      document.querySelectorAll("[data-fixed]").forEach((el) => { state.fixed[el.dataset.fixed] = n(el.value); });
      await persist();
      toast("Budget saved", "success");
    },
    "b-add-funds": () => openSheet(`<h2>Add funds</h2><p class="sheet-sub">Add extra money to your available budget.</p>
      <form data-form="funds" novalidate><label class="field"><span>Amount (PKR)</span><input name="amount" type="number" inputmode="numeric" min="1" step="100" placeholder="e.g. 2000" autofocus></label>
      <p class="form-error" hidden></p><button class="btn primary block" type="submit">Add funds</button></form>`),
    "b-export": () => exportCsv(),
    "b-reminder": async () => {
      if (!("Notification" in window)) { toast("Notifications are not supported on this browser.", "error"); return; }
      const p = await Notification.requestPermission();
      toast(p === "granted" ? "Reminder enabled while the app is open" : "Notifications are blocked. Check browser settings.", p === "granted" ? "success" : "error");
      renderBudget();
    },
    "b-reset": async () => {
      if (!(await confirmSheet({ title: "Reset budget?", message: "This permanently clears your saved budget and all daily records.", confirmLabel: "Reset everything" }))) return;
      state = defaultState(); selectedDate = dateKey(new Date());
      await persist(); toast("Budget reset", "success");
    },
    "b-day": (el) => { selectedDate = el.dataset.date; state.month = selectedDate.slice(0, 7); renderDiary(); },
    "b-month": (el) => { const [y, m] = state.month.split("-").map(Number); const d = new Date(y, m - 1 + Number(el.dataset.d), 1); state.month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; renderDiary(); },
    "b-add-meal": () => openMealPicker(),
    "b-pick": (el) => {
      const it = BB.data.items.find((x) => x.id === Number(el.dataset.id));
      if (!it) return;
      const r = ensureRecord();
      r.meals.push({ name: it.name, price: it._price, vendor: it._vendor, category: it._category });
      r.items = r.meals.map((x) => x.name);
      r.spent = n(r.spent) + it._price; r.ate = true;
      r.time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      closeSheet(); persist(); toast(`${it.name} added`, "success");
    },
    "b-add-other": () => openSheet(`<h2>Other expense</h2><p class="sheet-sub">Add food spending that is not on a restaurant menu.</p>
      <form data-form="other" novalidate><label class="field"><span>What was it?</span><input name="label" maxlength="80" placeholder="e.g. Tea and snacks" autofocus></label>
      <label class="field"><span>Amount (PKR)</span><input name="amount" type="number" inputmode="decimal" min="1" step="any" placeholder="e.g. 150"></label>
      <p class="form-error" hidden></p><button class="btn primary block" type="submit">Add expense</button></form>`),
    "b-remove-meal": (el) => {
      const r = ensureRecord(); const idx = Number(el.dataset.i); const meal = r.meals[idx];
      if (!meal) return;
      r.meals.splice(idx, 1); r.items = r.meals.map((x) => x.name);
      r.spent = Math.max(0, n(r.spent) - n(meal.price));
      persist();
    }
  });
  Object.assign(BB.forms, {
    funds: async (form) => {
      const amount = n(new FormData(form).get("amount"));
      const err = $(".form-error", form);
      if (amount <= 0) { err.textContent = "Enter an amount greater than zero."; err.hidden = false; return; }
      state.addedFunds = n(state.addedFunds) + amount;
      closeSheet(); await persist(); toast(`${moneyR(amount)} added`, "success");
    },
    other: async (form) => {
      const fd = new FormData(form);
      const amount = n(fd.get("amount"));
      const err = $(".form-error", form);
      if (amount <= 0) { err.textContent = "Enter an amount greater than zero."; err.hidden = false; return; }
      const r = ensureRecord();
      r.meals.push({ name: String(fd.get("label") || "").trim() || "Other expense", price: amount, vendor: "", category: "Other" });
      r.items = r.meals.map((x) => x.name);
      r.spent = n(r.spent) + amount; r.ate = true;
      closeSheet(); await persist(); toast("Expense added", "success");
    }
  });

  /* Field drafts: update state without re-rendering so typing is never interrupted */
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "bStart") { if (!state.budgetLocked) state.startBudget = t.value === "" ? null : n(t.value); saveDraft(); }
    else if (t.dataset && t.dataset.fixed) { state.fixed[t.dataset.fixed] = t.value === "" ? 0 : n(t.value); saveDraft(); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "dSpent") { const r = ensureRecord(); r.spent = n(t.value); r.ate = r.ate || r.spent > 0; persist(); }
    else if (t.id === "dNote") { const r = ensureRecord(); r.note = t.value.trim(); persistSoon(); }
    else if (t.id === "dAte") { const r = ensureRecord(); r.ate = t.checked; persistSoon(); }
    else if (t.dataset && t.dataset.fixed && state.budgetLocked) { state.fixed[t.dataset.fixed] = n(t.value); persistSoon(); }
  });

  /* ---------- CSV export ---------- */
  function exportCsv() {
    const rows = [["Date", "Time", "Spent (PKR)", "Ate today", "Meals selected", "Notes"]];
    Object.keys(state.records).sort().forEach((key) => {
      const r = state.records[key]; const [yy, mm, dd] = key.split("-");
      rows.push([`${dd}/${mm}/${yy.slice(-2)}`, r.time || "", n(r.spent), r.ate ? "Yes" : "No", (r.items || []).join("; "), r.note || ""]);
    });
    const csv = "\uFEFF" + rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = "budgetbite-expense-history.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Expense history exported", "success");
  }

  /* ---------- Reminder (while the app is open) ---------- */
  let reminderTimer = null;
  function scheduleReminder() {
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(() => {
      const now = new Date(); const key = dateKey(now);
      if (now.getHours() === 21 && now.getMinutes() === 0 && state._remindedDate !== key && "Notification" in window && Notification.permission === "granted") {
        if (!state.records[key]) new Notification("BudgetBite daily reminder", { body: "You have not recorded today's food spending yet." });
        state._remindedDate = key; saveDraft();
      }
    }, 30000);
  }

  BB.budget = { snapshot, addMeal, render: renderAll };
  renderAll();
  load();
  BB.on("data", () => { if (loaded) BB.emit("budget"); });
})();