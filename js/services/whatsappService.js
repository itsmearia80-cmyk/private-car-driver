const WhatsAppService = (() => {
  const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const fmtKm = (n) => (Math.round(n * 10) / 10).toString();
  const PROVIDER = { google: "Google Routes", osrm: "OSRM" };
  function buildMessage(s, route, fare) {
    const na = "Belum dapat dihitung";
    const pin = (label, text, sel) => { const l = typeof PlacesService !== "undefined" && PlacesService.mapsLink(sel); return l ? [`${label}: ${text}`, `Peta ${label}: ${l}`] : [`${label}: ${text}`]; };
    const wait = s.waitingHours ? `${s.waitingHours} jam` : "Tidak ada";
    const L = [`Halo, saya ingin booking ${CONFIG.business.name}.`, "",
      `Nama: ${s.name}`, `WhatsApp: ${s.whatsapp}`,
      `Tanggal: ${new Date(s.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
      `Jam: ${s.time}`, `Trip: ${s.tripType === "round-trip" ? "Round Trip" : "One Way"}`,
      ...pin("Pickup", s.pickup, s.pickupSel), ...pin("Destination", s.destination, s.destSel), `Jumlah Penumpang: ${s.passengers}`,
      `Jarak Estimasi: ${route ? fmtKm(route.distanceKm) + " km (satu arah)" : na}`,
      `Waiting: ${wait}`, `Estimasi Tarif: ${fare ? PricingService.formatRupiah(fare.estimatedTotal) : na}`,
      "Tol/Parkir: tidak termasuk estimasi",
      `Dihitung dengan: ${route ? PROVIDER[route.provider] || route.provider : "-"}`];
    if (s.notes) L.push(`Catatan: ${s.notes}`);
    L.push("", "Mohon konfirmasi ketersediaan dan harga final. Terima kasih.");
    return L.join("\n");
  }
  const buildUrl = (msg) => `https://wa.me/${CONFIG.whatsapp.driverNumber}?text=${encodeURIComponent(msg)}`;
  return { buildMessage, buildUrl, fmtDate, fmtKm };
})();
if (typeof module !== "undefined") module.exports = WhatsAppService;
