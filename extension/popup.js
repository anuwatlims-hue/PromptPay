(function () {
  "use strict";

  const STORAGE_KEY = "subsVault.catalog";
  const state = { catalog: null, revealed: new Set(), query: "" };
  const $ = (selector) => document.querySelector(selector);
  let toastTimer;

  const icons = {
    copy: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V5H5v11h3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12s3.2-6 9-6 9 6 9 6-3.2 6-9 6-9-6-9-6Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 4 16 16M9.5 6.4A9.8 9.8 0 0 1 12 6c5.8 0 9 6 9 6a15 15 0 0 1-2.1 2.8M6.2 7.5A16.6 16.6 0 0 0 3 12s3.2 6 9 6c1.1 0 2.2-.2 3.1-.6M10 10a2.8 2.8 0 0 0 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="8" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="m12 12 8 0m-3 0v3m-2-3v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  };

  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("visible"), 2200);
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      toast(message);
    } catch {
      toast("คัดลอกไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  }

  function maskedKey(key) {
    return `${key.slice(0, 10)}${"•".repeat(18)}${key.slice(-4)}`;
  }

  function createKeyCard(entry, index) {
    const card = document.createElement("article");
    card.className = `key-card${state.revealed.has(entry.id) ? " revealed" : ""}`;
    card.dataset.id = entry.id;

    const top = document.createElement("div");
    top.className = "key-card-top";
    const symbol = document.createElement("div");
    symbol.className = "key-symbol";
    symbol.innerHTML = icons.key;
    const title = document.createElement("div");
    title.className = "key-title";
    const strong = document.createElement("strong");
    strong.textContent = entry.label;
    const small = document.createElement("small");
    small.textContent = `SUBSCRIPTION ${String(index + 1).padStart(2, "0")}`;
    title.append(strong, small);

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const reveal = document.createElement("button");
    reveal.type = "button";
    reveal.className = "icon-button reveal-key";
    reveal.setAttribute("aria-label", state.revealed.has(entry.id) ? `ซ่อนคีย์ ${entry.label}` : `แสดงคีย์ ${entry.label}`);
    reveal.title = state.revealed.has(entry.id) ? "ซ่อนคีย์" : "แสดงคีย์";
    reveal.innerHTML = state.revealed.has(entry.id) ? icons.eyeOff : icons.eye;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "icon-button copy-key";
    copy.setAttribute("aria-label", `คัดลอกคีย์ ${entry.label}`);
    copy.title = "คัดลอกคีย์";
    copy.innerHTML = icons.copy;
    actions.append(reveal, copy);
    top.append(symbol, title, actions);

    const value = document.createElement("div");
    value.className = "key-value";
    value.textContent = state.revealed.has(entry.id) ? entry.key : maskedKey(entry.key);
    card.append(top, value);
    return card;
  }

  function render() {
    const hasCatalog = Boolean(state.catalog?.entries?.length);
    $("#empty-view").hidden = hasCatalog;
    $("#library-view").hidden = !hasCatalog;
    if (!hasCatalog) return;

    const { prefix, entries } = state.catalog;
    $("#key-count").textContent = `${entries.length} คีย์`;
    $("#prefix-text").textContent = prefix || "ไม่ได้ระบุ Product Prefix";
    $("#copy-prefix").disabled = !prefix;
    const query = state.query.trim().toLocaleLowerCase("th");
    const filtered = entries.filter((entry) => entry.label.toLocaleLowerCase("th").includes(query));
    const list = $("#key-list");
    list.replaceChildren(...filtered.map((entry) => createKeyCard(entry, entries.indexOf(entry))));
    $("#no-results").hidden = filtered.length > 0;
  }

  function openImport() {
    $("#settings-dialog").close();
    $("#import-error").hidden = true;
    $("#import-warning").hidden = !state.catalog;
    $("#import-text").value = "";
    $("#import-dialog").showModal();
    setTimeout(() => $("#import-text").focus(), 50);
  }

  async function saveCatalog(catalog) {
    await chrome.storage.local.set({ [STORAGE_KEY]: catalog });
    state.catalog = catalog;
    state.revealed.clear();
    state.query = "";
    $("#search-input").value = "";
    render();
  }

  $("#key-list").addEventListener("click", (event) => {
    const card = event.target.closest(".key-card");
    if (!card) return;
    const entry = state.catalog.entries.find((item) => item.id === card.dataset.id);
    if (event.target.closest(".copy-key")) copyText(entry.key, `คัดลอก “${entry.label}” แล้ว`);
    if (event.target.closest(".reveal-key")) {
      if (state.revealed.has(entry.id)) state.revealed.delete(entry.id);
      else state.revealed.add(entry.id);
      render();
    }
  });

  $("#copy-prefix").addEventListener("click", () => copyText(state.catalog.prefix, "คัดลอก Product Prefix แล้ว"));
  $("#search-input").addEventListener("input", (event) => { state.query = event.target.value; render(); });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && state.catalog) {
      event.preventDefault();
      $("#search-input").focus();
    }
  });

  ["#start-import", "#add-more", "#settings-import"].forEach((selector) => $(selector).addEventListener("click", openImport));
  $("#settings-button").addEventListener("click", () => $("#settings-dialog").showModal());
  document.querySelectorAll(".close-dialog").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));

  $("#import-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const catalog = SubsParser.parseCatalog($("#import-text").value);
      const saveButton = $("#save-import");
      saveButton.disabled = true;
      await saveCatalog(catalog);
      $("#import-dialog").close();
      saveButton.disabled = false;
      toast(`นำเข้า ${catalog.entries.length} คีย์เรียบร้อยแล้ว`);
    } catch (error) {
      $("#save-import").disabled = false;
      $("#import-error").textContent = error.message || "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง";
      $("#import-error").hidden = false;
    }
  });

  $("#export-data").addEventListener("click", () => {
    if (!state.catalog) { toast("ยังไม่มีข้อมูลให้สำรอง"); return; }
    const blob = new Blob([JSON.stringify(state.catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `subs-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("#settings-dialog").close();
    toast("ดาวน์โหลดไฟล์สำรองแล้ว โปรดเก็บไฟล์ให้ปลอดภัย");
  });

  $("#clear-data").addEventListener("click", async () => {
    if (!state.catalog) { toast("ไม่มีข้อมูลให้ลบ"); return; }
    if (!confirm("ลบ Product Prefix และคีย์ทั้งหมดออกจากส่วนขยายนี้?")) return;
    await chrome.storage.local.remove(STORAGE_KEY);
    state.catalog = null;
    state.revealed.clear();
    $("#settings-dialog").close();
    render();
    toast("ลบข้อมูลทั้งหมดแล้ว");
  });

  async function initialize() {
    try {
      await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      state.catalog = stored[STORAGE_KEY] || null;
      render();
    } catch {
      toast("เปิดที่เก็บข้อมูลไม่สำเร็จ กรุณาโหลดส่วนขยายใหม่");
    }
  }

  initialize();
})();
