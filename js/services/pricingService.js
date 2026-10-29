const PricingService = (() => {
  // returnKm opsional: jarak kembali sebenarnya (perjalanan beberapa tujuan). Tanpa returnKm, pulang-pergi = 2x jarak (aturan awal).
  const billableDistance = (km, tripType, returnKm) => (tripType === "round-trip" ? km + (returnKm != null ? returnKm : km) : km);
  const calculateDistanceCost = (km, tripType, returnKm) =>
    Math.round(billableDistance(km, tripType, returnKm) * CONFIG.pricing.pricePerKm);
  const calculateWaitingCost = (h) =>
    h <= 0 ? 0 : CONFIG.pricing.firstWaitingHour + (h - 1) * CONFIG.pricing.additionalWaitingHour;
  const calculateTotalFare = (distanceCost, waitingCost) => distanceCost + waitingCost;
  function calculateFare({ distanceKm, returnKm, tripType, waitingHours }) {
    const distanceCost = calculateDistanceCost(distanceKm, tripType, returnKm);
    const waitingCost = calculateWaitingCost(waitingHours);
    return { distanceKm, billableDistanceKm: billableDistance(distanceKm, tripType, returnKm), distanceCost, waitingCost,
      estimatedTotal: calculateTotalFare(distanceCost, waitingCost) };
  }
  const formatRupiah = (n) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
      .format(n).replace(/\s/g, "");
  return { calculateDistanceCost, calculateWaitingCost, calculateTotalFare, calculateFare, formatRupiah };
})();
if (typeof module !== "undefined") module.exports = PricingService;
