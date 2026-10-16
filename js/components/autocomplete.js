// Combobox saran alamat (ARIA + keyboard). Tetap bisa mengetik bebas; memilih saran membuat estimasi lebih akurat.
const Autocomplete = (() => {
  function attach(input) {
    if (!PlacesService.enabled()) return { getSelection: () => null };
    const wrap = document.createElement("div"); wrap.className = "ac"; input.parentNode.insertBefore(wrap, input); wrap.append(input);
    const list = document.createElement("ul"); list.className = "ac-list"; list.id = input.id + "-list"; list.setAttribute("role", "listbox"); list.hidden = true; wrap.append(list);
    const status = document.createElement("p"); status.className = "ac-status"; status.setAttribute("aria-live", "polite"); wrap.after(status);
    input.setAttribute("role", "combobox"); input.setAttribute("aria-autocomplete", "list"); input.setAttribute("aria-expanded", "false"); input.setAttribute("aria-controls", list.id); input.setAttribute("autocomplete", "off");
    let sel = null, items = [], active = -1, timer = null, ctl = null, token = PlacesService.newToken();
    const say = (t, ok) => { status.textContent = t || ""; status.className = "ac-status" + (ok ? " ok" : ""); };
    function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; }
    function hi(i) {
      active = i; items.forEach((_, k) => list.children[k].setAttribute("aria-selected", String(k === i)));
      if (i >= 0) input.setAttribute("aria-activedescendant", list.children[i].id); else input.removeAttribute("aria-activedescendant");
    }
    function choose(i) {
      const it = items[i]; if (!it) return;
      sel = it; input.value = it.text; token = PlacesService.newToken(); close();
      say("Location selected for a more accurate estimate.", true);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    function render(res) {
      items = res.items; list.replaceChildren();
      items.forEach((it, i) => {
        const li = document.createElement("li"); li.id = `${input.id}-opt-${i}`; li.className = "ac-opt"; li.setAttribute("role", "option"); li.setAttribute("aria-selected", "false");
        const b = document.createElement("b"), s = document.createElement("span"); b.textContent = it.main; s.textContent = it.secondary || ""; li.append(b, s);
        li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(i); }); list.append(li);
      });
      if (items.length) { const at = document.createElement("li"); at.className = "ac-attr"; at.setAttribute("aria-hidden", "true");
        at.textContent = res.source === "google" ? "Powered by Google" : "Suggestions: OpenStreetMap contributors"; list.append(at); }
      list.hidden = !items.length; input.setAttribute("aria-expanded", String(items.length > 0)); active = -1;
      say(items.length ? "Choose a suggestion for the most accurate estimate." : "No suggestions found. You can still type the address and share the exact location via WhatsApp.");
    }
    input.addEventListener("input", () => {
      if (sel && input.value !== sel.text) { sel = null; say(""); }
      clearTimeout(timer); if (ctl) ctl.abort();
      const q = input.value.trim();
      if (sel || q.length < PlacesService.minChars()) { close(); if (!sel) say(""); return; }
      timer = setTimeout(async () => {
        ctl = new AbortController();
        try { const res = await PlacesService.suggest(q, token, ctl.signal); if (input.value.trim() === q && !sel) render(res); }
        catch (e) { if (e.name !== "AbortError") close(); }
      }, PlacesService.debounceMs());
    });
    input.addEventListener("keydown", (e) => {
      if (list.hidden || !items.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); hi((active + 1) % items.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); hi((active - 1 + items.length) % items.length); }
      else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(active); }
      else if (e.key === "Escape") close();
    });
    input.addEventListener("blur", () => setTimeout(close, 150));
    return { getSelection: () => sel };
  }
  return { attach };
})();
