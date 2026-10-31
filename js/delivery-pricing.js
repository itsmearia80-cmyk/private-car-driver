// Tarif layanan pengiriman. SEMUA NILAI DI BAWAH ADALAH USULAN AWAL, belum final: ubah di sini (config.js tidak perlu disentuh).
// Rumus: max(minFare, baseFare + jarak x pricePerKm) + biaya ukuran. Tol & parkir tidak termasuk.
const DELIVERY = {
  pricePerKm: 5000,
  baseFare: 0,
  minFare: 40000,
  sizes: [
    { id: "document", name: "Document / envelope", hint: "Up to A4 size, about 1 kg", surcharge: 0 },
    { id: "small", name: "Small parcel", hint: "About a shoebox, up to 5 kg", surcharge: 0 },
    { id: "medium", name: "Medium box", hint: "Up to about 60 x 45 x 45 cm, 15 kg", surcharge: 0 },
    { id: "large", name: "Large item", hint: "Up to about 100 x 60 x 60 cm, 30 kg", surcharge: 25000 },
    { id: "oversize", name: "Bigger than Large", hint: "Needs a custom quote", surcharge: 0, quote: true }
  ],
  weights: [
    { id: "w1", label: "Up to 1 kg" }, { id: "w5", label: "1 - 5 kg" }, { id: "w15", label: "5 - 15 kg" },
    { id: "w30", label: "15 - 30 kg" }, { id: "wmax", label: "Over 30 kg (custom quote)", quote: true }
  ],
  // Daftar sementara, pemilik perlu menetapkan versi final.
  banned: ["Illegal goods, drugs and weapons", "Explosives, fuel and other flammable or hazardous materials", "Anything the driver cannot legally carry"]
};
const DeliveryPricing = (() => {
  const sizeOf = (id) => DELIVERY.sizes.find((s) => s.id === id);
  const weightOf = (id) => DELIVERY.weights.find((w) => w.id === id);
  const needsQuote = (sizeId, weightId) => !!((sizeOf(sizeId) || {}).quote || (weightOf(weightId) || {}).quote);
  function calculate({ distanceKm, tripType, sizeId }) {
    // Jarak dibulatkan ke 0,1 km sebelum dikali tarif (angka di layar x tarif = biaya yang ditagih).
    const km = Math.round(distanceKm * 10) / 10, size = sizeOf(sizeId), billable = tripType === "round-trip" ? km * 2 : km;
    const distanceCost = Math.round(billable * DELIVERY.pricePerKm), subtotal = DELIVERY.baseFare + distanceCost;
    const base = Math.max(DELIVERY.minFare, subtotal), surcharge = size ? size.surcharge : 0;
    return { billableDistanceKm: billable, distanceCost, minApplied: DELIVERY.minFare > subtotal, base, surcharge, estimatedTotal: base + surcharge };
  }
  return { calculate, needsQuote, sizeOf, weightOf };
})();
if (typeof module !== "undefined") module.exports = { DELIVERY, DeliveryPricing };
