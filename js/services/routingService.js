// Pintu tunggal routing. UI & pricing hanya menerima objek ternormalisasi. Gagal = melempar error.
//  calculateRoute(asal, tujuan)        -> { distanceKm, durationMinutes, provider, status }
//  calculateTrip(asal, [tujuan1, 2])   -> { distanceKm (asal->tujuan terakhir), returnKm (tujuan terakhir->asal), legsKm, durationMinutes, provider, status }
const RoutingService = (() => {
  const providers = () => ({ google: GoogleRoutesProvider, osrm: OsrmProvider });
  let trace = [];
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  async function withFallback(run) {
    const R = CONFIG.routing; trace = [];
    const attempt = async (name) => {
      try { const r = await run(providers()[name]); trace.push(name + ": OK " + (r.distanceKm || 0).toFixed(1) + " km"); return r; }
      catch (e) { trace.push(name + ": GAGAL - " + e.message); throw e; }
    };
    try { return await attempt(R.primary); }
    catch (e) {
      console.warn("[routing] primary (" + R.primary + ") gagal:", e.message);
      if (!R.enableFallback || !R.fallback || R.fallback === R.primary) throw e;
      return await attempt(R.fallback);
    }
  }
  const calculateRoute = (origin, destination) => withFallback((p) => p.getRoute(origin, destination));
  // Perjalanan beberapa tujuan: titik = [asal, ...tujuan, asal]; ruas terakhir = kembali ke asal.
  const calculateTrip = (origin, destinations) => withFallback(async (p) => {
    const L = await p.getLegs([origin, ...destinations, origin]), n = L.legsKm.length;
    return { distanceKm: sum(L.legsKm.slice(0, n - 1)), returnKm: L.legsKm[n - 1], legsKm: L.legsKm.slice(0, n - 1),
      durationMinutes: sum(L.legsMin.slice(0, n - 1)), provider: L.provider, status: "success" };
  });
  return { calculateRoute, calculateTrip, getTrace: () => trace.slice() };
})();
if (typeof module !== "undefined") module.exports = RoutingService;
