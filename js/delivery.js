(() => {
  const $ = (id) => document.getElementById(id), form = $("dvForm"), rp = PricingService.formatRupiah;
  const FIELDS = ["size", "weight", "desc", "confirm", "date", "time", "pickup", "dropoff", "name", "whatsapp", "rname", "rphone"];
  const INPUT = { size: () => form.querySelector('input[name="size"]'), weight: () => $("dl-weight"), confirm: () => $("dl-confirm") };
  const el = (f) => (INPUT[f] ? INPUT[f]() : $("dl-" + f));
  const MSG_FAIL = "We couldn't calculate the route yet. Please check the address or send your request directly via WhatsApp.";
  const MSG_OFFLINE = "No internet connection, so the route can't be calculated yet. You can still send your request via WhatsApp once you're back online.";
  const QUOTE = "This item is bigger or heavier than our standard limits, so it needs a custom quote. Send the details via WhatsApp and the driver will reply with a price.";
  let route = null, routeKey = "", failMsg = "", busy = false, ready = false;
  const DEBUG = new URLSearchParams(location.search).has("debug");
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x) e.textContent = x; return e; };

  // Opsi ukuran & berat dibuat dari DELIVERY agar satu sumber kebenaran
  DELIVERY.sizes.forEach((z) => {
    const l = mk("label", "opt"), i = document.createElement("input"), s = mk("span"), sur = z.quote ? "Custom quote" : z.surcharge ? "+" + rp(z.surcharge) : "No surcharge";
    i.type = "radio"; i.name = "size"; i.value = z.id; s.append(mk("b", "", z.name), mk("small", "", z.hint), mk("em", "", sur)); l.append(i, s); $("sizeOpts").append(l);
  });
  DELIVERY.weights.forEach((w) => { const o = mk("option", "", w.label); o.value = w.id; $("dl-weight").append(o); });
  DELIVERY.banned.forEach((b) => $("bannedList").append(mk("li", "", b)));

  const ac = { pickup: Autocomplete.attach($("dl-pickup")), dropoff: Autocomplete.attach($("dl-dropoff")) };
  const place = (text, sel) => (sel ? { text: sel.text, placeId: sel.placeId, lat: sel.lat, lon: sel.lon } : text);
  const read = () => ({
    size: (form.querySelector('input[name="size"]:checked') || {}).value || "", weight: $("dl-weight").value, desc: $("dl-desc").value.trim(),
    value: parseInt($("dl-value").value.replace(/\D/g, ""), 10) || 0, confirm: $("dl-confirm").checked,
    tripType: (form.querySelector('input[name="tripType"]:checked') || { value: "one-way" }).value, date: $("dl-date").value, time: $("dl-time").value,
    pickup: $("dl-pickup").value.trim(), dropoff: $("dl-dropoff").value.trim(), pickupSel: ac.pickup.getSelection(), dropSel: ac.dropoff.getSelection(),
    name: $("dl-name").value.trim(), whatsapp: $("dl-whatsapp").value.trim(), rname: $("dl-rname").value.trim(), rphone: $("dl-rphone").value.trim(),
    notes: $("dl-notes").value.trim().slice(0, CONFIG.booking.maxNotesLength)
  });
  const idOf = (x) => (x ? x.placeId || x.id || "" : "");
  const keyOf = (s) => (s.pickup + "|" + idOf(s.pickupSel) + "|" + s.dropoff + "|" + idOf(s.dropSel)).toLowerCase();
  const fareOf = (s) => (route ? DeliveryPricing.calculate({ distanceKm: route.distanceKm, tripType: s.tripType, sizeId: s.size }) : null);

  function validate(s) {
    const e = {};
    if (!s.size) e.size = "Please choose the item size.";
    if (!s.weight) e.weight = "Please choose the approximate weight.";
    if (s.desc.length < 3) e.desc = "Please describe what you are sending.";
    if (!s.confirm) e.confirm = "Please confirm that your item is allowed.";
    if (!s.date) e.date = "Please select a pickup date."; else if (s.date < Validation.todayISO()) e.date = "Please select today or a future date.";
    if (!s.time) e.time = "Please select a pickup time.";
    if (!s.pickup) e.pickup = "Please enter the pickup location.";
    if (!s.dropoff) e.dropoff = "Please enter the drop-off location.";
    else if (s.pickup && s.pickup.toLowerCase() === s.dropoff.toLowerCase()) e.dropoff = "Pickup and drop-off appear to be the same. Please check the locations.";
    if (!s.name) e.name = "Please enter your name.";
    if (!s.whatsapp) e.whatsapp = "Please enter your WhatsApp number."; else if (!Validation.isValidPhone(s.whatsapp)) e.whatsapp = "Please enter a valid Indonesian number, e.g. 08123456789.";
    if (!s.rname) e.rname = "Please enter the recipient's name.";
    if (!s.rphone) e.rphone = "Please enter the recipient's phone number."; else if (!Validation.isValidPhone(s.rphone)) e.rphone = "Please enter a valid Indonesian number, e.g. 08123456789.";
    return e;
  }
  function showErrors(errs) {
    FIELDS.forEach((f) => { $("de-" + f).textContent = errs[f] || ""; const x = el(f); if (x) x.setAttribute("aria-invalid", errs[f] ? "true" : "false"); });
    $("de-form").textContent = Object.keys(errs).length ? "Please complete the required fields." : "";
    const first = FIELDS.find((f) => errs[f]); if (first) el(first).focus();
  }
  const row = (k, v, cls) => { const d = mk("div", cls), a = mk("dt", "", k), b = mk("dd", "", v); d.append(a, b); return d; };
  function showTrace() {
    if (!DEBUG) return;
    let p = $("dv-debug"); if (!p) { p = mk("pre", "debug"); p.id = "dv-debug"; $("dv-note").after(p); }
    p.textContent = "DEBUG (?debug=1)\nDomain: " + location.origin + "\nGoogle API key terisi: " + (CONFIG.routing.google.apiKey ? "ya" : "TIDAK") + "\n" + RoutingService.getTrace().join("\n");
  }

  function render() {
    const s = read(), quote = DeliveryPricing.needsQuote(s.size, s.weight), fare = quote ? null : fareOf(s), tbc = "To be confirmed";
    const z = DeliveryPricing.sizeOf(s.size), w = DeliveryPricing.weightOf(s.weight), trip = s.tripType === "round-trip" ? "Round Trip" : "One Way";
    const est = $("dv-estimate"), sum = $("dv-summary"); est.replaceChildren(); sum.replaceChildren();
    $("dv-estPanel").hidden = quote;
    if (!quote) {
      est.append(row("Distance", route ? WhatsAppService.fmtKm(route.distanceKm) + " km one way" : tbc), row("Trip", trip), row("Distance Cost", fare ? rp(fare.distanceCost) : tbc));
      if (fare && fare.minApplied) est.append(row("Minimum fare applied", rp(DELIVERY.minFare)));
      est.append(row("Item size surcharge", fare ? (fare.surcharge ? rp(fare.surcharge) : "None") : tbc), row("Estimated Total", fare ? rp(fare.estimatedTotal) : tbc, "total"), row("Toll & Parking", "Not included"));
    }
    const n = $("dv-note");
    n.textContent = quote ? QUOTE : !route ? (failMsg || MSG_FAIL) : route.distanceKm > CONFIG.routing.longTripKm ? "Long-distance trip. Final fare must be confirmed by driver." : "";
    n.className = "note" + (quote || !route ? " bad" : "");
    [["Sender", s.name], ["Sender WhatsApp", s.whatsapp], ["Recipient", s.rname], ["Recipient Phone", s.rphone], ["Item", s.desc], ["Size", z ? z.name : ""], ["Approx. Weight", w ? w.label : ""],
     ...(s.value ? [["Item Value", rp(s.value)]] : []), ["Trip", trip], ["Pickup Date", WhatsAppService.fmtDate(s.date)], ["Pickup Time", s.time], ["Pickup", s.pickup], ["Drop-off", s.dropoff],
     ["Estimated Fare", quote ? "Custom quote" : fare ? rp(fare.estimatedTotal) : tbc], ["Toll / Parking", "Not included"], ...(s.notes ? [["Additional Notes", s.notes]] : [])].forEach(([k, v]) => sum.append(row(k, v)));
    $("dv-send").textContent = quote ? "ASK FOR A QUOTE VIA WHATSAPP" : "SEND REQUEST TO WHATSAPP";
    $("dv-result").hidden = false; ready = true;
  }
  const hide = () => { $("dv-result").hidden = true; ready = false; };

  function message(s, fare, quote) {
    const na = "Belum dapat dihitung", pin = (label, text, sel) => { const l = typeof PlacesService !== "undefined" && PlacesService.mapsLink(sel); return l ? [`${label}: ${text}`, `Peta ${label}: ${l}`] : [`${label}: ${text}`]; };
    const z = DeliveryPricing.sizeOf(s.size), w = DeliveryPricing.weightOf(s.weight);
    const L = [`Halo, saya ingin booking pengiriman ${CONFIG.business.name}.`, "", `Pengirim: ${s.name}`, `WhatsApp: ${s.whatsapp}`, `Penerima: ${s.rname}`, `Telepon Penerima: ${s.rphone}`,
      `Tanggal: ${WhatsAppService.fmtDate(s.date)}`, `Jam: ${s.time}`, `Trip: ${s.tripType === "round-trip" ? "Round Trip" : "One Way"}`,
      ...pin("Pickup", s.pickup, s.pickupSel), ...pin("Drop-off", s.dropoff, s.dropSel), `Barang: ${s.desc}`, `Ukuran: ${z.name}`, `Perkiraan Berat: ${w.label}`];
    if (s.value) L.push(`Nilai Barang: ${rp(s.value)}`);
    L.push(`Jarak Estimasi: ${route ? WhatsAppService.fmtKm(route.distanceKm) + " km (satu arah)" : quote ? "-" : na}`,
      `Estimasi Tarif: ${quote ? "Perlu penawaran khusus" : fare ? rp(fare.estimatedTotal) : na}`, "Tol/Parkir: tidak termasuk estimasi");
    if (s.notes) L.push(`Catatan: ${s.notes}`);
    L.push("", "Mohon konfirmasi ketersediaan dan harga final. Terima kasih.");
    return L.join("\n");
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault(); if (busy) return;
    const s = read(), errs = validate(s); showErrors(errs); if (Object.keys(errs).length) return;
    if (DeliveryPricing.needsQuote(s.size, s.weight)) { route = null; routeKey = ""; render(); $("dv-result").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    busy = true; const btn = $("dv-btn"); btn.disabled = true; btn.textContent = "CALCULATING..."; $("de-form").textContent = "Calculating your route..."; failMsg = "";
    if (!navigator.onLine) { route = null; routeKey = ""; failMsg = MSG_OFFLINE; }
    else if (!route || routeKey !== keyOf(s)) {
      route = null; routeKey = "";
      try { route = await RoutingService.calculateRoute(place(s.pickup, s.pickupSel), place(s.dropoff, s.dropSel)); routeKey = keyOf(s); }
      catch (e) { console.error("[route]", e); route = null; failMsg = MSG_FAIL; }
    }
    showTrace(); $("de-form").textContent = ""; busy = false; btn.disabled = false; btn.textContent = "GET ESTIMATE";
    render(); $("dv-result").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  let lastTried = { pickup: "", dropoff: "" };
  form.addEventListener("submit", () => { lastTried = read(); }, true);
  form.addEventListener("input", () => {
    if (!ready) return;
    const k = keyOf(read());
    if (route ? k !== routeKey : false) { route = null; routeKey = ""; hide(); return; }
    if (!route && failMsg && k !== keyOf(lastTried)) { hide(); return; }
    render();
  });
  $("dv-send").addEventListener("click", () => {
    const s = read(), errs = validate(s); if (Object.keys(errs).length) { showErrors(errs); hide(); return; }
    const quote = DeliveryPricing.needsQuote(s.size, s.weight);
    window.open(WhatsAppService.buildUrl(message(s, quote ? null : fareOf(s), quote)), "_blank", "noopener");
  });
  $("dl-date").min = Validation.todayISO(); $("dl-notes").maxLength = CONFIG.booking.maxNotesLength;
  const sur = DELIVERY.sizes.filter((z) => z.surcharge > 0).map((z) => `${z.name} (+${rp(z.surcharge)})`);
  $("dl-hint").textContent = `Minimum fare ${rp(DELIVERY.minFare)}.` + (sur.length ? ` Surcharge: ${sur.join(", ")}.` : "");
})();
