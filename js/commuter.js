(() => {
  const $ = (id) => document.getElementById(id), form = $("cmForm"), rp = (n) => PricingService.formatRupiah(n), L = CommuterLogic;
  const booking = COMMUTER.mode === "booking", FIELDS = ["route", "date", "seats", "name", "whatsapp"];
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x) e.textContent = x; return e; };
  const routeOf = (id) => COMMUTER.routes.find((r) => r.id === id);
  const map = (p) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p);
  const place = (label, text) => { const p = el("p", "rt-place"), b = el("b", "", label + ": "), a = el("a", "", "Open in Maps"); a.href = map(text); a.target = "_blank"; a.rel = "noopener";
    p.append(b, document.createTextNode(text + " "), a); return p; };

  $("cmNote").textContent = booking ? "Seat requests are confirmed via WhatsApp. In the early stage, departures may follow passenger demand."
    : "This service is opening soon. Register your interest and we will contact you once the schedule is confirmed.";
  $("cm-datelabel").textContent = booking ? "Travel Date *" : "Preferred Start Date (optional)";
  $("cm-send").textContent = booking ? "REQUEST SEATS VIA WHATSAPP" : "REGISTER INTEREST VIA WHATSAPP";
  $("cmFormTitle").textContent = booking ? "Request seats" : "Register your interest";

  COMMUTER.routes.forEach((r) => {
    const c = el("div", "rt"), b = el("button", "btn", booking ? "Request a seat" : "Register interest");
    b.type = "button"; b.addEventListener("click", () => choose(r.id));
    c.append(el("h3", "", r.name), el("p", "rt-time", `${r.time} WIB · ${L.daysLabel(r)}`), place("Pickup", r.from), place("Drop-off", r.to),
      el("p", "rt-price", `${rp(r.price)} per seat, one way`), el("p", "rt-meta", `Up to ${COMMUTER.maxSeats} seats per trip`), el("p", "rt-desc", r.description), b);
    $("routeCards").append(c);
    const o = el("option", "", `${r.name} (${r.time} WIB)`); o.value = r.id; $("cm-route").append(o);
  });
  for (let i = 1; i <= COMMUTER.maxSeats; i++) { const o = el("option", "", String(i)); o.value = String(i); $("cm-seats").append(o); }
  $("cm-date").min = L.jakartaNow().dateISO;

  function summary() {
    const r = routeOf($("cm-route").value), box = $("cmSummary"), seats = parseInt($("cm-seats").value, 10) || 1; box.replaceChildren();
    $("cm-dhint").textContent = r ? `${r.name} runs ${L.daysLabel(r)} at ${r.time} WIB.` : "";
    if (!r) return;
    [["Route", r.name], ["Pickup", r.from], ["Drop-off", r.to], ["Departure", `${r.time} WIB · ${L.daysLabel(r)}`], ["Price per seat", rp(r.price)], ["Seats", String(seats)],
      ["Estimated total", rp(L.total(r, seats))]].forEach(([k, v]) => { const d = el("div", k === "Estimated total" ? "total" : ""), a = el("dt", "", k), x = el("dd", "", v); d.append(a, x); box.append(d); });
  }
  function choose(id) {
    $("cm-route").value = id; summary(); $("cmBook").hidden = false;
    $("cmBook").scrollIntoView({ behavior: "smooth", block: "start" }); $("cm-name").focus({ preventScroll: true });
  }
  $("cm-route").addEventListener("change", summary); $("cm-seats").addEventListener("change", summary);

  const read = () => ({ route: $("cm-route").value, date: $("cm-date").value, seats: parseInt($("cm-seats").value, 10), name: $("cm-name").value.trim(),
    whatsapp: $("cm-whatsapp").value.trim(), notes: $("cm-notes").value.trim().slice(0, CONFIG.booking.maxNotesLength) });
  function validate(s) {
    const e = {}, r = routeOf(s.route), now = L.jakartaNow();
    if (!r) e.route = "Please choose a route.";
    if (!s.date) { if (booking) e.date = "Please select a travel date."; }
    else if (r && !L.isOperatingDay(r, s.date)) e.date = `${r.name} runs ${L.daysLabel(r)}. Please choose another date.`;
    else if (r && L.departurePassed(r, s.date, now)) e.date = s.date < now.dateISO ? "Please select today or a future date." : "Today's departure time has already passed. Please choose another date.";
    if (!(s.seats >= 1 && s.seats <= COMMUTER.maxSeats)) e.seats = `Please choose 1 to ${COMMUTER.maxSeats} seats.`;
    if (!s.name) e.name = "Please enter your name.";
    if (!s.whatsapp) e.whatsapp = "Please enter your WhatsApp number."; else if (!Validation.isValidPhone(s.whatsapp)) e.whatsapp = "Please enter a valid Indonesian number, e.g. 08123456789.";
    return e;
  }
  function message(s, r) {
    const B = CONFIG.business.name.toUpperCase() + " COMMUTER";
    const L1 = [booking ? `Halo, saya ingin memesan kursi ${B}.` : `Halo, saya tertarik dengan ${B}.`, "", `Rute: ${r.name}`, `Jemput: ${r.from}`, `Tujuan: ${r.to}`];
    if (s.date) L1.push(`Tanggal: ${L.longDate(s.date)}`);
    L1.push(`Berangkat: ${r.time} WIB`, `Jumlah Kursi: ${s.seats}`);
    if (booking) L1.push(`Tarif: ${rp(r.price)} per kursi (total ${rp(L.total(r, s.seats))})`);
    L1.push(`Nama: ${s.name}`, `WhatsApp: ${s.whatsapp}`);
    if (s.notes) L1.push(`Catatan: ${s.notes}`);
    L1.push("", booking ? "Mohon konfirmasi ketersediaan kursi. Terima kasih." : "Mohon kabari saya saat jadwal sudah dikonfirmasi. Terima kasih.");
    return L1.join("\n");
  }
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const s = read(), errs = validate(s);
    FIELDS.forEach((f) => { $("ce-" + f).textContent = errs[f] || ""; $("cm-" + f).setAttribute("aria-invalid", errs[f] ? "true" : "false"); });
    $("ce-form").textContent = Object.keys(errs).length ? "Please complete the required fields." : "";
    const first = FIELDS.find((f) => errs[f]); if (first) { $("cm-" + first).focus(); return; }
    window.open(WhatsAppService.buildUrl(message(s, routeOf(s.route))), "_blank", "noopener");
  });
})();
