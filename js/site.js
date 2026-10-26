// Elemen bersama semua halaman: nama brand, tautan WhatsApp, footer, info harga dari config.
(() => {
  const $ = (id) => document.getElementById(id), rp = (n) => PricingService.formatRupiah(n), P = CONFIG.pricing;
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  document.querySelectorAll("[data-brand]").forEach((n) => (n.textContent = CONFIG.business.name));
  const wa = `https://wa.me/${CONFIG.whatsapp.driverNumber}?text=${encodeURIComponent(`Halo, saya ingin bertanya tentang layanan ${CONFIG.business.name}.`)}`;
  ["waTop", "waBottom"].forEach((id) => { const e = $(id); if (e) e.href = wa; });
  set("fWa", "WhatsApp: +" + CONFIG.whatsapp.driverNumber);
  if (CONFIG.business.operatingArea) set("fArea", "Operating area: " + CONFIG.business.operatingArea);
  if (CONFIG.business.serviceHours) set("fHours", "Service hours: " + CONFIG.business.serviceHours);
  document.querySelectorAll("[data-fill]").forEach((e) => {
    const k = e.dataset.fill;
    e.textContent = k === "delivery" ? (typeof DELIVERY !== "undefined" ? `Minimum fare ${rp(DELIVERY.minFare)}. Toll & parking not included.` : "") : k === "perKm" ? `${rp(P.pricePerKm)} per km`
      : k === "waiting" ? `Waiting time: ${rp(P.firstWaitingHour)} for the first hour, then ${rp(P.additionalWaitingHour)} per additional hour. Toll & parking not included.` : "";
  });
})();
