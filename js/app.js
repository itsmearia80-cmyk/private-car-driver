(() => {
  const $ = (id) => document.getElementById(id), form = $("bookingForm"), rp = PricingService.formatRupiah;
  const FIELDS = ["name", "whatsapp", "date", "time", "pickup", "destination", "passengers"];
  const MSG_FAIL = "We couldn't calculate the route yet. Please check the address or send your booking directly via WhatsApp.";
  const MSG_OFFLINE = "No internet connection, so the route can't be calculated yet. You can still send your booking via WhatsApp once you're back online.";
  let route = null, routeKey = "", failMsg = "", busy = false, ready = false;

  const DEBUG = new URLSearchParams(location.search).has("debug"); // tambahkan ?debug=1 di URL untuk melihat penyebab kegagalan routing
  function showTrace() {
    if (!DEBUG) return;
    let p = $("debug"); if (!p) { p = document.createElement("pre"); p.id = "debug"; p.className = "debug"; $("routeNote").after(p); }
    p.textContent = "DEBUG (hanya muncul dengan ?debug=1)\nDomain: " + location.origin + "\nGoogle API key terisi: " + (CONFIG.routing.google.apiKey ? "ya" : "TIDAK") + "\n" + RoutingService.getTrace().join("\n");
  }
  const ac = { pickup: Autocomplete.attach($("pickup")), destination: Autocomplete.attach($("destination")) };
  const place = (text, sel) => (sel ? { text: sel.text, placeId: sel.placeId, lat: sel.lat, lon: sel.lon } : text);
  const read = () => ({
    name: $("name").value.trim(), whatsapp: $("whatsapp").value.trim(),
    tripType: (form.querySelector('input[name="tripType"]:checked') || { value: "one-way" }).value, date: $("date").value, time: $("time").value,
    pickup: $("pickup").value.trim(), destination: $("destination").value.trim(),
    passengers: parseInt($("passengers").value, 10), waitingHours: parseInt($("waiting").value, 10) || 0,
    pickupSel: ac.pickup.getSelection(), destSel: ac.destination.getSelection(),
    notes: $("notes").value.trim().slice(0, CONFIG.booking.maxNotesLength)
  });
  const idOf = (sel) => (sel ? sel.placeId || sel.id || "" : "");
  const keyOf = (s) => (s.pickup + "|" + idOf(s.pickupSel) + "|" + s.destination + "|" + idOf(s.destSel)).toLowerCase();
  const fareOf = (s) => route ? PricingService.calculateFare({ distanceKm: route.distanceKm, tripType: s.tripType, waitingHours: s.waitingHours }) : null;

  function showErrors(errs) {
    FIELDS.forEach((f) => { $("e-" + f).textContent = errs[f] || ""; $(f).setAttribute("aria-invalid", errs[f] ? "true" : "false"); });
    $("e-form").textContent = Object.keys(errs).length ? "Please complete the required fields." : "";
    const first = FIELDS.find((f) => errs[f]); if (first) $(first).focus();
  }
  const row = (k, v, cls) => { const d = document.createElement("div"); if (cls) d.className = cls;
    const a = document.createElement("dt"), b = document.createElement("dd"); a.textContent = k; b.textContent = v; d.append(a, b); return d; };

  function render() {
    const s = read(), fare = fareOf(s), tbc = "To be confirmed";
    const wait = s.waitingHours ? `${s.waitingHours} hour${s.waitingHours > 1 ? "s" : ""}` : "No waiting";
    const est = $("estimate"), sum = $("summary"); est.replaceChildren(); sum.replaceChildren();
    est.append(row("Distance", route ? WhatsAppService.fmtKm(route.distanceKm) + " km one way" : tbc),
      row("Trip", s.tripType === "round-trip" ? "Round Trip" : "One Way"),
      row("Distance Cost", fare ? rp(fare.distanceCost) : tbc), row("Waiting", wait + (fare && s.waitingHours ? " (" + rp(fare.waitingCost) + ")" : "")),
      row("Estimated Total", fare ? rp(fare.estimatedTotal) : tbc, "total"), row("Toll & Parking", "Not included"));
    const n = $("routeNote");
    n.textContent = !route ? (failMsg || MSG_FAIL) : route.distanceKm > CONFIG.routing.longTripKm ? "Long-distance trip. Final fare must be confirmed by driver." : "";
    n.className = "note" + (route ? "" : " bad");
    [["Customer", s.name], ["WhatsApp", s.whatsapp], ["Trip", s.tripType === "round-trip" ? "Round Trip" : "One Way"],
     ["Pickup Date", WhatsAppService.fmtDate(s.date)], ["Pickup Time", s.time], ["Pickup", s.pickup], ["Destination", s.destination],
     ["Passengers", String(s.passengers)], ["Waiting Time", wait], ["Estimated Fare", fare ? rp(fare.estimatedTotal) : tbc],
     ["Toll / Parking", "Not included"], ...(s.notes ? [["Additional Notes", s.notes]] : [])].forEach(([k, v]) => sum.append(row(k, v)));
    $("result").hidden = false; ready = true;
  }
  const hide = () => { $("result").hidden = true; ready = false; };

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault(); if (busy) return;
    const s = read(), errs = Validation.validateBooking(s); showErrors(errs); if (Object.keys(errs).length) return;
    busy = true; const btn = $("estimateBtn"); btn.disabled = true; btn.textContent = "CALCULATING..."; $("e-form").textContent = "Calculating your route...";
    failMsg = "";
    if (!navigator.onLine) { route = null; routeKey = ""; failMsg = MSG_OFFLINE; }
    else if (!route || routeKey !== keyOf(s)) {
      route = null; routeKey = "";
      try { route = await RoutingService.calculateRoute(place(s.pickup, s.pickupSel), place(s.destination, s.destSel)); routeKey = keyOf(s); }
      catch (e) { console.error("[route]", e); route = null; failMsg = MSG_FAIL; }
    }
    showTrace(); $("e-form").textContent = ""; busy = false; btn.disabled = false; btn.textContent = "GET ESTIMATE";
    render(); $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  form.addEventListener("input", () => {
    if (!ready) return;
    const k = keyOf(read());
    if (route ? k !== routeKey : false) { route = null; routeKey = ""; hide(); return; }
    if (!route && failMsg && k !== keyOf(lastTried)) { hide(); return; }
    render();
  });
  let lastTried = { pickup: "", destination: "" };
  form.addEventListener("submit", () => { lastTried = read(); }, true);

  $("sendBtn").addEventListener("click", () => {
    const s = read(), errs = Validation.validateBooking(s); if (Object.keys(errs).length) { showErrors(errs); hide(); return; }
    window.open(WhatsAppService.buildUrl(WhatsAppService.buildMessage(s, route, fareOf(s))), "_blank", "noopener");
  });

  $("waitHint").textContent = `Waiting: first hour ${rp(CONFIG.pricing.firstWaitingHour)}, each additional hour ${rp(CONFIG.pricing.additionalWaitingHour)}.`;
  $("date").min = Validation.todayISO(); $("passengers").max = CONFIG.booking.maxPassengers; $("notes").maxLength = CONFIG.booking.maxNotesLength;
})();
