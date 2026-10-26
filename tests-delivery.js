// Tes rumus tarif pengiriman: node tests-delivery.js
const { DELIVERY, DeliveryPricing: P } = require("./js/delivery-pricing.js");
const t = (n, a, e) => { const ok = JSON.stringify(a) === JSON.stringify(e); console.log((ok ? "PASS " : "FAIL ") + n, ok ? "" : `(got ${JSON.stringify(a)}, want ${JSON.stringify(e)})`); if (!ok) process.exitCode = 1; };
const F = (d, tt, z) => P.calculate({ distanceKm: d, tripType: tt, sizeId: z });
t("10 km, small = Rp50.000 (above minimum)", F(10, "one-way", "small").estimatedTotal, 50000);
t("3 km, small = minimum Rp40.000", [F(3, "one-way", "small").estimatedTotal, F(3, "one-way", "small").minApplied], [40000, true]);
t("10 km, no minimum flag", F(10, "one-way", "small").minApplied, false);
t("3 km round trip (6 km = 30.000) -> minimum", F(3, "round-trip", "document").estimatedTotal, 40000);
t("10 km, medium = 50.000 + 15.000", F(10, "one-way", "medium").estimatedTotal, 65000);
t("3 km, medium = minimum 40.000 + 15.000", F(3, "one-way", "medium").estimatedTotal, 55000);
t("25 km, large = 125.000 + 35.000", F(25, "one-way", "large").estimatedTotal, 160000);
t("25 km round trip, large = 250.000 + 35.000", F(25, "round-trip", "large").estimatedTotal, 285000);
t("document and small have no surcharge", [F(10, "one-way", "document").surcharge, F(10, "one-way", "small").surcharge], [0, 0]);
t("fractional distance rounds the cost: 8.4 km", F(8.4, "one-way", "small").distanceCost, 42000);
t("oversize needs a quote", P.needsQuote("oversize", "w1"), true);
t("over 30 kg needs a quote", P.needsQuote("small", "wmax"), true);
t("standard item does not need a quote", P.needsQuote("large", "w30"), false);
t("every size has an id and a surcharge number", DELIVERY.sizes.every((s) => s.id && typeof s.surcharge === "number"), true);
