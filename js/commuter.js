// UI halaman COMMUTER. Semua data dari js/commuter-config.js; logika dari js/commuter-logic.js.
(() => {
  const $ = (id) => document.getElementById(id), C = COMMUTER, L = CommuterLogic, rp = PricingService.formatRupiah;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const problems = L.configProblems(), isOpen = C.enabled && !problems.length;
  if (problems.length) console.error("[commuter] config problems:", problems);
  const routes = C.routes.filter((r) => r.enabled), byId = (id) => routes.find((r) => r.id === id);
  const N = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], d = [...C.operatingDays].sort();
  const days = d.length > 2 && d.every((x, i) => !i || x === d[i - 1] + 1) ? N[d[0]] + "–" + N[d[d.length - 1]] : d.map((x) => N[x]).join(", ");
  const row = (k, v) => { const r = el("div"); r.append(el("dt", "", k), el("dd", "", v)); return r; };
  const wa = (msg) => window.open(WhatsAppService.buildUrl(msg), "_blank", "noopener");
  document.querySelectorAll("[data-cutoff]").forEach((e) => (e.textContent = C.bookingCutoffHours));
  const f = { route: $("cm-route"), date: $("cm-date"), seats: $("cm-seats"), name: $("cm-name"), whatsapp: $("cm-whatsapp"), notes: $("cm-notes") };

  routes.forEach((r) => {
    const card = el("div", "pkg"), dl = el("dl"), b = el("button", "btn", isOpen ? "Book Now" : "Coming Soon"); b.type = "button";
    dl.append(row("Pickup", r.origin), row("Destination", r.destination), row("Departure", r.departureTime + " WIB"), row("Operating days", days), row("Booking", "Subject to confirmation by PRIVARO"));
    if (isOpen) dl.append(row("Capacity", "Up to " + C.capacity + " seats"));
    card.append(el("h3", "", r.name), el("p", "pkg-price", rp(r.fare) + " / seat"), el("p", "pkg-km", "One way, per passenger"), el("p", "note", r.description), dl);
    if (/^https:\/\//.test(r.mapUrl || "")) { const a = el("a", "", "View pickup point on map"); a.href = r.mapUrl; a.target = "_blank"; a.rel = "noopener"; card.append(a); }
    if (isOpen) b.addEventListener("click", () => { f.route.value = r.id; fillDates(); $("book").scrollIntoView({ behavior: "smooth" }); f.date.focus({ preventScroll: true }); }); else b.disabled = true;
    card.append(b); $("routeCards").append(card);
    const o = el("option", "", r.name + " (" + r.departureTime + " WIB)"); o.value = r.id; f.route.append(o);
  });
  routes.forEach((r) => {
    const ps = C.passes.filter((p) => p.route === r.id); if (!ps.length) return;
    const g = el("div", "cards"); $("passCards").append(el("h3", "", r.name + " passes"), g);
    ps.forEach((p) => { const c = el("div", "pkg"), b = el("button", "btn", isOpen ? "Buy via WhatsApp" : "Coming Soon"); b.type = "button";
      c.append(el("h3", "", p.trips + " rides"), el("p", "pkg-price", rp(p.price)), el("p", "pkg-km", rp(Math.round(p.price / p.trips)) + " per ride · valid " + p.validityDays + " days"), b);
      if (isOpen) b.addEventListener("click", () => wa(L.passMessage(p, r))); else b.disabled = true; g.append(c); });
  });
  for (let i = 1; i <= C.capacity; i++) { const o = el("option", "", String(i)); o.value = i; f.seats.append(o); }

  function renderFare() {
    const r = byId(f.route.value), n = parseInt(f.seats.value, 10), box = $("cmFare"); box.replaceChildren(); if (!r || !n) return;
    box.append(row("Route", r.name), row("Departure", r.departureTime + " WIB"), row("Fare per seat", rp(r.fare)), row("Seats", n + " × " + rp(r.fare)), row("Total", rp(r.fare * n))); box.lastChild.className = "total";
  }
  function fillDates() {
    const r = byId(f.route.value), ds = r ? L.availableDates(r) : []; f.date.replaceChildren();
    if (!ds.length) { const o = el("option", "", r ? "No dates available" : "Choose a route first"); o.value = ""; f.date.append(o); }
    ds.forEach((iso) => { const o = el("option", "", L.fmtDate(iso, "en-GB")); o.value = iso; f.date.append(o); }); renderFare();
  }
  if (isOpen) {
    f.route.addEventListener("change", fillDates); f.seats.addEventListener("change", renderFare); fillDates();
    $("cmForm").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const res = L.build({ routeId: f.route.value, date: f.date.value, seats: parseInt(f.seats.value, 10), name: f.name.value, whatsapp: f.whatsapp.value, notes: f.notes.value });
      const keys = ["route", "date", "seats", "name", "whatsapp"];
      keys.forEach((k) => { $("ce-" + k).textContent = res.errors[k] || ""; f[k].setAttribute("aria-invalid", res.errors[k] ? "true" : "false"); });
      $("ce-form").textContent = res.errors.form || (Object.keys(res.errors).length ? "Please complete the required fields." : "");
      const first = keys.find((k) => res.errors[k]); if (first) f[first].focus();
      if (!res.booking) return; wa(L.message(res.booking));
      $("cmSent").textContent = "WhatsApp opened with your request (ref " + res.booking.ref + "). Your seat is not confirmed until PRIVARO replies.";
    });
    $("waBottom").href = WhatsAppService.buildUrl("Halo PRIVARO, saya ingin reservasi kursi COMMUTER.");
  } else {
    $("book").hidden = true; $("closedNote").hidden = false;
    ["heroCta", "waBottom"].forEach((id) => { const a = $(id); a.textContent = "Coming Soon"; a.removeAttribute("href"); a.removeAttribute("target"); a.setAttribute("aria-disabled", "true"); });
  }
})();
