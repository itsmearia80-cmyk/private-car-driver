// Pintu tunggal routing. UI & pricing hanya menerima objek ternormalisasi:
// { distanceKm, durationMinutes, provider: "google"|"osrm", status: "success" }. Gagal = melempar error.
const RoutingService = (() => {
  const providers = () => ({ google: GoogleRoutesProvider, osrm: OsrmProvider });
  let trace = [];
  async function attempt(name, origin, destination) {
    try { const r = await providers()[name].getRoute(origin, destination); trace.push(name + ": OK " + r.distanceKm.toFixed(1) + " km"); return r; }
    catch (e) { trace.push(name + ": GAGAL - " + e.message); throw e; }
  }
  async function calculateRoute(origin, destination) {
    const R = CONFIG.routing; trace = [];
    try { return await attempt(R.primary, origin, destination); }
    catch (e) {
      console.warn("[routing] primary (" + R.primary + ") gagal:", e.message);
      if (!R.enableFallback || !R.fallback || R.fallback === R.primary) throw e;
      return await attempt(R.fallback, origin, destination);
    }
  }
  return { calculateRoute, getTrace: () => trace.slice() };
})();
if (typeof module !== "undefined") module.exports = RoutingService;
