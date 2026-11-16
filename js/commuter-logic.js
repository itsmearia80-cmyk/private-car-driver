// Logika murni COMMUTER (tanpa DOM): tanggal Jakarta, batas pemesanan, tarif, objek booking, pesan WhatsApp.
const CommuterLogic = (() => {
  const OFFSET = 7; // Asia/Jakarta = UTC+7, tanpa DST. Tidak memakai jam perangkat pengunjung.
  const parseISO = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return null; const y = +m[1], mo = +m[2], d = +m[3], t = new Date(Date.UTC(y, mo - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { y, mo, d, dow: t.getUTCDay() } : null; };
  const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);
  const todayISO = (now = Date.now()) => isoOf(now + OFFSET * 36e5);
  const addDays = (iso, n) => { const p = parseISO(iso); return isoOf(Date.UTC(p.y, p.mo - 1, p.d) + n * 864e5); };
  const departureMs = (r, iso) => { const p = parseISO(iso), t = r.departureTime.split(":"); return Date.UTC(p.y, p.mo - 1, p.d, +t[0] - OFFSET, +t[1]); };
  const fmtDate = (iso, loc = "id-ID") => { const p = parseISO(iso); return new Date(Date.UTC(p.y, p.mo - 1, p.d)).toLocaleDateString(loc, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
  const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

  function dateError(r, iso, now = Date.now()) {
    const p = parseISO(iso), C = COMMUTER; if (!p) return "Please choose a valid date.";
    if (!C.operatingDays.includes(p.dow)) return "We don't operate on this day.";
    if (C.blackoutDates.includes(iso)) return "No service on this date.";
    if (iso > addDays(todayISO(now), C.maxAdvanceDays)) return "This date is too far ahead to book.";
    if (now > departureMs(r, iso) - C.bookingCutoffHours * 36e5) return "Booking for this departure is closed.";
    return "";
  }
  const availableDates = (r, now = Date.now()) => { const t = todayISO(now), out = []; for (let i = 0; i <= COMMUTER.maxAdvanceDays; i++) { const d = addDays(t, i); if (!dateError(r, d, now)) out.push(d); } return out; };
  const seatsOk = (n) => Number.isInteger(n) && n >= 1 && n <= COMMUTER.capacity;

  // Mengembalikan { errors } atau { errors: {}, booking }. Booking SELALU berstatus pending_confirmation (tidak pernah otomatis confirmed/paid).
  function build(i, now = Date.now()) {
    const e = {}, C = COMMUTER, r = C.routes.find((x) => x.id === i.routeId && x.enabled), name = clean(i.name, 80);
    if (!C.enabled) e.form = "Commuter booking is not open yet.";
    if (!r) e.route = "Please choose a route."; else if (dateError(r, i.date, now)) e.date = dateError(r, i.date, now);
    if (name.length < 2) e.name = "Please enter your full name.";
    if (!i.whatsapp || !Validation.isValidPhone(i.whatsapp)) e.whatsapp = "Please enter a valid Indonesian number, e.g. 08123456789.";
    if (!seatsOk(i.seats)) e.seats = `Please choose 1 to ${C.capacity} seats.`;
    if (Object.keys(e).length) return { errors: e };
    const ref = `PVC-${i.date.replace(/-/g, "")}-${r.code || r.id[0].toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return { errors: {}, booking: { ref, route: r, date: i.date, seats: i.seats, name, whatsapp: Validation.normalizePhone(i.whatsapp), notes: clean(i.notes, CONFIG.booking.maxNotesLength), fare: r.fare, total: r.fare * i.seats, status: "pending_confirmation" } };
  }
  function message(b) {
    const rp = PricingService.formatRupiah, L = ["Halo PRIVARO,", "Saya ingin reservasi kursi COMMUTER.", "", `Ref: ${b.ref}`, `Layanan: ${b.route.name}`, `Rute: ${b.route.origin} -> ${b.route.destination}`,
      `Tanggal: ${fmtDate(b.date)}`, `Keberangkatan: ${b.route.departureTime} WIB`, `Nama: ${b.name}`, `WhatsApp: ${b.whatsapp}`, `Jumlah Kursi: ${b.seats}`, `Tarif per Kursi: ${rp(b.fare)}`, `Total: ${rp(b.total)}`];
    if (b.notes) L.push(`Catatan: ${b.notes}`);
    L.push("", "Mohon konfirmasi ketersediaan kursi dan instruksi pembayaran. Terima kasih."); return L.join("\n");
  }
  const passMessage = (p, r) => ["Halo PRIVARO,", "Saya ingin membeli paket COMMUTER.", "", `Rute: ${r.name} (${r.origin} -> ${r.destination})`, `Paket: ${p.trips} perjalanan`, `Harga: ${PricingService.formatRupiah(p.price)}`,
    `Masa berlaku: ${p.validityDays} hari`, "", "Mohon konfirmasi ketersediaan dan instruksi pembayaran. Nama saya: (isi nama). Terima kasih."].join("\n");

  function configProblems() {
    const c = COMMUTER, p = [], ids = new Set();
    if (c.timezone !== "Asia/Jakarta") p.push("timezone must be Asia/Jakarta");
    if (!Number.isInteger(c.capacity) || c.capacity < 1) p.push("capacity");
    if (!Array.isArray(c.operatingDays) || !c.operatingDays.length || c.operatingDays.some((d) => !(d >= 0 && d <= 6))) p.push("operatingDays");
    if (!Array.isArray(c.blackoutDates) || c.blackoutDates.some((d) => !parseISO(d))) p.push("blackoutDates");
    if (!(c.bookingCutoffHours >= 0) || !(c.maxAdvanceDays >= 1)) p.push("bookingCutoffHours/maxAdvanceDays");
    (c.routes || []).forEach((r) => { if (!r.id || ids.has(r.id)) p.push("route id " + r.id); ids.add(r.id);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.departureTime)) p.push(r.id + " departureTime"); if (!Number.isInteger(r.fare) || r.fare <= 0) p.push(r.id + " fare"); });
    (c.passes || []).forEach((x) => { if (!ids.has(x.route) || !(x.trips >= 1) || !(x.price > 0)) p.push("pass " + x.id); });
    if (!ids.size) p.push("no routes"); return p;
  }
  return { todayISO, addDays, dateError, availableDates, seatsOk, build, message, passMessage, fmtDate, configProblems };
})();
if (typeof module !== "undefined") module.exports = CommuterLogic;
