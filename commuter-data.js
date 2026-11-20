// PRIVARO COMMUTER: rute, tarif, jadwal. Ubah di sini (config.js tidak perlu disentuh).
const COMMUTER = {
  // "booking"  = penumpang meminta kursi, dikonfirmasi pemilik lewat WhatsApp.
  // "interest" = hanya mendaftar minat (belum memesan). Pakai ini selama izin/regulasi operasional belum diverifikasi.
  mode: "booking",
  maxSeats: 5,
  routes: [
    { id: "morning", name: "Morning Commuter", from: "The Garden Sawangan, Depok", to: "MRT Blok M, Jakarta Selatan", time: "07:00", days: [1, 2, 3, 4, 5, 6], price: 35000,
      description: "Start your workday with a scheduled ride from Sawangan to MRT Blok M." },
    { id: "evening", name: "Evening Commuter", from: "SPBU Pertamina near Tebet Eco Park, Jakarta Selatan", to: "MRT Lebak Bulus, Jakarta Selatan", time: "19:00", days: [1, 2, 3, 4, 5, 6], price: 30000,
      description: "A comfortable scheduled ride from Tebet to MRT Lebak Bulus after your day's activities." }
  ]
};
const CommuterLogic = (() => {
  const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOf = (iso) => new Date(iso + "T00:00:00Z").getUTCDay();
  const toMinutes = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  // Waktu sekarang di Jakarta (WIB), bukan zona waktu perangkat pelanggan.
  function jakartaNow(d = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d).map((x) => [x.type, x.value]));
    return { dateISO: `${p.year}-${p.month}-${p.day}`, minutes: (Number(p.hour) % 24) * 60 + Number(p.minute) };
  }
  const isOperatingDay = (route, iso) => route.days.includes(dayOf(iso));
  const departurePassed = (route, iso, now) => iso < now.dateISO || (iso === now.dateISO && now.minutes >= toMinutes(route.time));
  function daysLabel(route) {
    const d = [...route.days].sort((a, b) => a - b), contiguous = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
    return contiguous && d.length > 2 ? `${SHORT[d[0]]}–${SHORT[d[d.length - 1]]}` : d.map((x) => SHORT[x]).join(", ");
  }
  const total = (route, seats) => route.price * seats;
  const longDate = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return { dayOf, jakartaNow, isOperatingDay, departurePassed, daysLabel, total, longDate };
})();
if (typeof module !== "undefined") module.exports = { COMMUTER, CommuterLogic };
