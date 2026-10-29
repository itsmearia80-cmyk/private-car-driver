// Tes perjalanan beberapa tujuan (hingga 2): node tests-trip.js
const fs = require("fs");
const src = ["js/config.js", "js/services/googleRoutesProvider.js", "js/services/osrmProvider.js", "js/services/routingService.js"].map((f) => fs.readFileSync(f, "utf8").replace(/if \(typeof module[^\n]*\n?/g, "")).join("\n");
const { CONFIG, RoutingService } = new Function(src + "; return { CONFIG, RoutingService };")();
global.CONFIG = CONFIG; CONFIG.routing.osrm.minGapMs = 0;
const t = (n, c) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) process.exitCode = 1; };
const js = (o, s = 200) => ({ ok: s < 400, status: s, json: async () => o });
const gLegs = (...m) => ({ routes: [{ legs: m.map((d) => ({ distanceMeters: d, duration: "600s" })) }] });
const osrmLegs = (...m) => ({ code: "Ok", routes: [{ legs: m.map((d) => ({ distance: d, duration: 600 })) }] });
(async () => {
  CONFIG.routing.google.apiKey = "K"; let body, mask, calls = [];
  global.fetch = async (u, o) => { calls.push(u); if (u === CONFIG.routing.google.endpoint) { body = JSON.parse(o.body); mask = o.headers["X-Goog-FieldMask"]; return js(body.intermediates.length === 2 ? gLegs(5000, 7000, 6000) : gLegs(5000, 6000)); } return js({}, 500); };
  const A = { text: "A", placeId: "PA" }, B = { text: "B", placeId: "PB" }, C = { text: "C", lat: -6.3, lon: 106.9 };
  let r = await RoutingService.calculateTrip(A, [B, C]);
  t("google: one call, origin = pickup, final destination = pickup, 2 intermediates", calls.length === 1 && body.origin.placeId === "PA" && body.destination.placeId === "PA" && body.intermediates.length === 2 && body.intermediates[0].placeId === "PB" && body.intermediates[1].location.latLng.latitude === -6.3);
  t("google: field mask asks for legs only", /routes\.legs\.distanceMeters/.test(mask) && !/routes\.distanceMeters,/.test(mask));
  t("google: outbound = leg1 + leg2 (12 km), return = leg3 (6 km), legs listed", r.distanceKm === 12 && r.returnKm === 6 && r.legsKm.join() === "5,7" && r.provider === "google" && r.durationMinutes === 20);
  r = await RoutingService.calculateTrip(A, [B]);
  t("one destination also works (A->B->A: 5 km out, 6 km back)", body.intermediates.length === 1 && r.provider === "google" && r.distanceKm === 5 && r.returnKm === 6);
  // Google gagal -> OSRM
  calls = []; let osrmUrl;
  global.fetch = async (u) => { calls.push(u);
    if (u === CONFIG.routing.google.endpoint) return js({}, 403);
    if (u.includes("nominatim")) return js([{ lat: "-6.2", lon: "106.8" }]);
    osrmUrl = u; return js(osrmLegs(4000, 8000, 5000)); };
  r = await RoutingService.calculateTrip("alamat A", ["alamat B", "alamat C"]);
  t("google 403 -> OSRM fallback with legs", r.provider === "osrm" && r.distanceKm === 12 && r.returnKm === 5);
  t("osrm: pickup geocoded once (3 geocodes for 4 points)", calls.filter((u) => u.includes("nominatim")).length === 3);
  t("osrm: route request has 4 coordinates", osrmUrl.split("/driving/")[1].split("?")[0].split(";").length === 4);
  // rincian tidak lengkap
  CONFIG.routing.enableFallback = false;
  global.fetch = async (u) => u === CONFIG.routing.google.endpoint ? js(gLegs(5000, 7000)) : js({}, 500);
  let threw = false; try { await RoutingService.calculateTrip(A, [B, C]); } catch (e) { threw = true; }
  t("incomplete legs from google -> error (no guessing)", threw);
  global.fetch = async () => js({}, 500); threw = false; try { await RoutingService.calculateTrip(A, [B]); } catch (e) { threw = true; }
  t("all providers fail -> error", threw);
  t("trace lists failures for debug", RoutingService.getTrace().some((x) => /GAGAL/.test(x)));
})();
