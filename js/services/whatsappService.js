const WhatsAppService = (() => {
  const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const fmtKm = (n) => (Math.round(n * 10) / 10).toString();
  function buildMessage(s, route, fare) {
    const tbc = "To be confirmed", rp = PricingService.formatRupiah;
    const wait = s.waitingHours ? `${s.waitingHours} hour${s.waitingHours > 1 ? "s" : ""}` : "No waiting";
    const L = ["NEW BOOKING REQUEST", "", "Customer:", s.name, "", "WhatsApp:", s.whatsapp, "", "Service:", s.service, "",
      "Trip:", s.tripType === "round-trip" ? "Round Trip" : "One Way", "", "Pickup Date:", fmtDate(s.date), "",
      "Pickup Time:", s.time, "", "Pickup:", s.pickup, "", "Destination:", s.destination, "",
      "Passengers:", String(s.passengers), "", "Estimated Distance:", route ? `${fmtKm(route.distanceKm)} km one way` : tbc, "",
      "Waiting Time:", wait, "", "Distance Cost:", fare ? rp(fare.distanceCost) : tbc, "",
      "Waiting Cost:", fare ? rp(fare.waitingCost) : tbc, "", "Estimated Total:", fare ? rp(fare.estimatedTotal) : tbc, ""];
    if (s.notes) L.push("Additional Notes:", s.notes, "");
    L.push("Toll/Parking:", "Not included in the estimate", "", "Please confirm availability and final fare.");
    return L.join("\n");
  }
  const buildUrl = (msg) => `https://wa.me/${CONFIG.whatsapp.driverNumber}?text=${encodeURIComponent(msg)}`;
  return { buildMessage, buildUrl, fmtDate, fmtKm };
})();
