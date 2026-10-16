// Tes saran alamat & waypoint presisi (fetch palsu): node tests-places.js
const fs = require("fs");
const src = ["js/config.js","js/services/googleRoutesProvider.js","js/services/osrmProvider.js","js/services/routingService.js","js/services/placesService.js"].map((f) => fs.readFileSync(f, "utf8").replace(/if \(typeof module[^\n]*\n?/g, "")).join("\n");
const { CONFIG, RoutingService, PlacesService } = new Function(src + "; return { CONFIG, RoutingService, PlacesService };")();
global.CONFIG = CONFIG; CONFIG.routing.osrm.minGapMs = 0;
const t = (n, c) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) process.exitCode = 1; };
const js = (o, s = 200) => ({ ok: s < 400, status: s, json: async () => o });
const gAuto = { suggestions: [{ placePrediction: { placeId: "PID1", text: { text: "Jl. Petogogan, Kebayoran Baru, Jakarta" }, structuredFormat: { mainText: { text: "Jl. Petogogan" }, secondaryText: { text: "Kebayoran Baru, Jakarta" } } } }, { queryPrediction: {} }] };
const photonRes = { features: [{ properties: { name: "Petogogan", district: "Kebayoran Baru", city: "Jakarta Selatan", state: "DKI Jakarta", countrycode: "ID", osm_type: "N", osm_id: 7 }, geometry: { coordinates: [106.8, -6.24] } },
  { properties: { name: "Petogogan", city: "Singapore", countrycode: "SG" }, geometry: { coordinates: [103.8, 1.3] } }] };
(async () => {
  CONFIG.routing.google.apiKey = "K"; let calls = [];
  global.fetch = async (u, o) => { calls.push(u); return u.includes("places.googleapis") ? js(gAuto) : js(photonRes); };
  let r = await PlacesService.suggest("Petogogan", "tok");
  t("google: hanya placePrediction, ada placeId", r.source === "google" && r.items.length === 1 && r.items[0].placeId === "PID1" && r.items[0].main === "Jl. Petogogan");
  r = await PlacesService.suggest("Petogogan", "tok"); t("cache: tidak memanggil ulang", calls.length === 1);
  global.fetch = async (u) => u.includes("places.googleapis") ? js({}, 403) : js(photonRes);
  r = await PlacesService.suggest("Kebayoran", "tok");
  t("google 403 -> OSM, hanya Indonesia, ada koordinat", r.source === "osm" && r.items.length === 1 && r.items[0].lat === -6.24 && /Kebayoran Baru/.test(r.items[0].text));
  calls = []; global.fetch = async (u) => { calls.push(u); return u.includes("places.googleapis") ? js(gAuto) : js(photonRes); };
  r = await PlacesService.suggest("Depok baru", "tok"); t("setelah google gagal, tidak dicoba lagi (circuit breaker)", r.source === "osm" && !calls.some((u) => u.includes("places.googleapis")));
  t("mapsLink placeId", /query_place_id=PID1/.test(PlacesService.mapsLink({ placeId: "PID1", text: "X" })));
  t("mapsLink koordinat", PlacesService.mapsLink({ lat: -6.2, lon: 106.8 }) === "https://www.google.com/maps/search/?api=1&query=-6.2,106.8");
  t("mapsLink tanpa pilihan = null", PlacesService.mapsLink(null) === null);
  // waypoint ke Google Routes
  let body; CONFIG.routing.enableFallback = false;
  global.fetch = async (u, o) => { body = JSON.parse(o.body); return js({ routes: [{ distanceMeters: 12000, duration: "900s" }] }); };
  await RoutingService.calculateRoute({ text: "A", placeId: "PA" }, { text: "B", lat: -6.3, lon: 106.9 });
  t("routes: placeId dan koordinat dipakai", body.origin.placeId === "PA" && body.destination.location.latLng.latitude === -6.3);
  await RoutingService.calculateRoute("alamat A", "alamat B"); t("routes: teks bebas tetap didukung", body.origin.address === "alamat A");
  // OSRM tanpa geocoding bila koordinat sudah ada
  CONFIG.routing.google.apiKey = ""; CONFIG.routing.enableFallback = true; CONFIG.routing.primary = "osrm"; calls = [];
  global.fetch = async (u) => { calls.push(u); return js({ code: "Ok", routes: [{ distance: 5000, duration: 600 }] }); };
  r = await RoutingService.calculateRoute({ text: "A", lat: -6.2, lon: 106.8 }, { text: "B", lat: -6.3, lon: 106.9 });
  t("osrm: koordinat dipakai langsung, tanpa geocoder", r.distanceKm === 5 && calls.length === 1 && calls[0].includes("106.8,-6.2;106.9,-6.3"));
})();
