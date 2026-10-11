// Segmen PRIVATE CAR + Driver PACKAGE (terpisah dari booking per-km, tanpa routing/estimasi).
// Ubah harga / included km di sini; kartu dan pesan WhatsApp otomatis mengikuti.
const PACKAGES = [
  { id: "6h", name: "6 Hours Package", price: 350000, includedKm: 60 },
  { id: "12h", name: "12 Hours Package", price: 550000, includedKm: 120 },
  { id: "24h", name: "24 Hours Package", price: 750000, includedKm: 200 }
];
(() => {
  const $ = (id) => document.getElementById(id), rp = (n) => PricingService.formatRupiah(n);
  const sel = $("pk-package"), form = $("pkgForm");
  const FIELDS = ["package", "name", "whatsapp", "date", "time", "pickup", "passengers"];
  const find = (id) => PACKAGES.find((p) => p.id === id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

  function summary() {
    const p = find(sel.value), box = $("pkgSummary"); box.replaceChildren();
    if (!p) return;
    [["Package", p.name], ["Price", rp(p.price)], ["Included KM", p.includedKm + " KM"]].forEach(([k, v]) => {
      const d = el("div"), a = el("dt", "", k), b = el("dd", "", v); d.append(a, b); box.append(d);
    });
  }
  function choose(id) {
    sel.value = id; summary(); $("pkgBook").hidden = false;
    $("pkgBook").scrollIntoView({ behavior: "smooth", block: "start" }); $("pk-name").focus({ preventScroll: true });
  }
  PACKAGES.forEach((p) => {
    const card = el("div", "pkg"), btn = el("button", "btn", "Book this package");
    btn.type = "button"; btn.addEventListener("click", () => choose(p.id));
    card.append(el("h3", "", p.name), el("p", "pkg-price", rp(p.price)), el("p", "pkg-km", "Included KM: " + p.includedKm + " KM"), btn);
    $("pkgCards").append(card);
    const o = el("option", "", `${p.name} (${rp(p.price)})`); o.value = p.id; sel.append(o);
  });
  sel.addEventListener("change", summary);

  const read = () => ({
    package: sel.value, name: $("pk-name").value.trim(), whatsapp: $("pk-whatsapp").value.trim(), date: $("pk-date").value,
    time: $("pk-time").value, pickup: $("pk-pickup").value.trim(), passengers: parseInt($("pk-passengers").value, 10),
    notes: $("pk-notes").value.trim().slice(0, CONFIG.booking.maxNotesLength)
  });
  function validate(s) {
    const e = {};
    if (!s.package) e.package = "Please choose a package.";
    if (!s.name) e.name = "Please enter your full name.";
    if (!s.whatsapp) e.whatsapp = "Please enter your WhatsApp number.";
    else if (!Validation.isValidPhone(s.whatsapp)) e.whatsapp = "Please enter a valid Indonesian number, e.g. 08123456789.";
    if (!s.date) e.date = "Please select a pickup date."; else if (s.date < Validation.todayISO()) e.date = "Please select today or a future date.";
    if (!s.time) e.time = "Please select a pickup time.";
    if (!s.pickup) e.pickup = "Please enter the pickup location.";
    if (!(s.passengers >= 1 && s.passengers <= CONFIG.booking.maxPassengers)) e.passengers = `Please enter 1 to ${CONFIG.booking.maxPassengers} passengers.`;
    return e;
  }
  function buildMessage(s, p) {
    const date = new Date(s.date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const L = [`Halo, saya ingin booking paket ${CONFIG.business.name}.`, "", `Nama: ${s.name}`, `WhatsApp: ${s.whatsapp}`,
      `Paket: ${p.name}`, `Harga Paket: ${rp(p.price)}`, `Included KM: ${p.includedKm} km`, `Tanggal: ${date}`, `Jam: ${s.time}`,
      `Pickup: ${s.pickup}`, `Jumlah Penumpang: ${s.passengers}`];
    if (s.notes) L.push(`Catatan: ${s.notes}`);
    L.push("", "Mohon konfirmasi ketersediaan dan detail final. Terima kasih.");
    return L.join("\n");
  }
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const s = read(), errs = validate(s);
    FIELDS.forEach((f) => { $("pe-" + f).textContent = errs[f] || ""; $("pk-" + f).setAttribute("aria-invalid", errs[f] ? "true" : "false"); });
    $("pe-form").textContent = Object.keys(errs).length ? "Please complete the required fields." : "";
    const first = FIELDS.find((f) => errs[f]); if (first) { $("pk-" + first).focus(); return; }
    window.open(WhatsAppService.buildUrl(buildMessage(s, find(s.package))), "_blank", "noopener");
  });
  $("pk-date").min = Validation.todayISO(); $("pk-passengers").max = CONFIG.booking.maxPassengers; $("pk-notes").maxLength = CONFIG.booking.maxNotesLength;
})();
