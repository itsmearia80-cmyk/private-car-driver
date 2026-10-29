// Jalankan: node tests.js
const fs = require("fs");
global.CONFIG = new Function(fs.readFileSync("js/config.js", "utf8") + "; return CONFIG;")();
const P = require("./js/services/pricingService.js"), V = require("./js/utils/validation.js");
const t = (n, a, e) => { const ok = a === e; console.log((ok ? "PASS " : "FAIL ") + n, ok ? "" : `(got ${a}, want ${e})`); if (!ok) process.exitCode = 1; };
const F = (d, tt, w) => P.calculateFare({ distanceKm: d, tripType: tt, waitingHours: w }).estimatedTotal;
t("1 one-way 10km", F(10, "one-way", 0), 50000);
t("2 round-trip 10km", F(10, "round-trip", 0), 100000);
t("3 wait 1h", F(10, "one-way", 1), 70000);
t("4 wait 2h", F(10, "one-way", 2), 80000);
t("5 round 10km wait 3h", F(10, "round-trip", 3), 140000);
t("wait 0/1/2/3", [0,1,2,3].map(P.calculateWaitingCost).join(), "0,20000,30000,40000");
t("66 one-way 42.5km+1h", F(42.5, "one-way", 1), 232500);
t("66 round 42.5km+1h", F(42.5, "round-trip", 1), 445000);
t("tarif per km di config", CONFIG.pricing.pricePerKm, 5000);
t("rupiah", P.formatRupiah(145000), "Rp145.000");
t("phone 08..", V.normalizePhone("0812-3456-789"), "628123456789");
t("phone +62", V.normalizePhone("+628123456789"), "628123456789");
t("reject abc", V.isValidPhone("abc"), false);
t("reject 123", V.isValidPhone("123"), false);
t("past date", !!V.validateBooking({ name:"a", whatsapp:"08123456789", date:"2000-01-01", time:"05:00", pickup:"a", destination:"b", passengers:1 }).date, true);
// --- perjalanan beberapa tujuan: jarak kembali sebenarnya
{ const c = (o) => P.calculateFare(Object.assign({ waitingHours: 0 }, o));
  t("returnKm: round trip = outbound + return (12 + 6 km = Rp90.000)", c({ distanceKm: 12, returnKm: 6, tripType: "round-trip" }).distanceCost, 90000);
  t("returnKm ignored for one way (12 km = Rp60.000)", c({ distanceKm: 12, returnKm: 6, tripType: "one-way" }).distanceCost, 60000);
  t("no returnKm: round trip still doubles (10 km = Rp100.000)", c({ distanceKm: 10, tripType: "round-trip" }).distanceCost, 100000); }
