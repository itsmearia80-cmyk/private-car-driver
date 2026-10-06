// Tes logika routing dengan fetch palsu: node tests-routing.js
const fs = require("fs");
global.CONFIG = new Function(fs.readFileSync("js/config.js", "utf8") + "; return CONFIG;")();
CONFIG.routing.minGapMs = 0;
const R = require("./js/services/routingService.js");
let calls = [], ok = true;
const t = (n, c) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) { ok = false; process.exitCode = 1; } };
const js = (o, s = 200) => ({ ok: s < 400, status: s, json: async () => o });
const osrm = (m) => js({ code: "Ok", routes: [{ distance: m, duration: 3600 }] });
(async () => {
  // 1) Nominatim 429 -> Photon; OSRM utama mati -> OSRM cadangan
  global.fetch = async (u) => { calls.push(u);
    if (u.includes("nominatim")) return js({}, 429);
    if (u.includes("photon")) return js({ features: [{ geometry: { coordinates: [106.8, -6.2] } }] });
    if (u.includes("project-osrm")) return js({}, 503);
    return osrm(42500); };
  let r = await R.getRouteDistance("A", "B");
  t("fallback geocoder + router", Math.abs(r.distanceKm - 42.5) < 1e-9 && r.approximate === false);
  // 2) alamat panjang tidak ketemu -> varian perkiraan
  calls = [];
  global.fetch = async (u) => { calls.push(u);
    if (u.includes("nominatim")) return js(decodeURIComponent(u).includes("q=Jl. X No 5, Cinangka, Depok") ? [] : [{ lat: "-6.4", lon: "106.8" }]);
    return osrm(10000); };
  r = await R.getRouteDistance("Jl. X No 5, Cinangka, Depok", "Bandara");
  t("varian perkiraan ditandai approximate", r.approximate === true && r.distanceKm === 10);
  // 3) semua gagal -> melempar error (UI menampilkan To be confirmed)
  global.fetch = async () => js({}, 500);
  let threw = false; try { await R.getRouteDistance("A", "B"); } catch (e) { threw = true; }
  t("semua gagal -> error", threw);
})();
