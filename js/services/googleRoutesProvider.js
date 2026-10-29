// PRIMARY. Google Routes API (Compute Routes). Hanya field Essentials, tanpa traffic.
const GoogleRoutesProvider = (() => {
  // Titik bisa berupa teks bebas atau saran terpilih: placeId > koordinat > alamat teks.
  const waypoint = (p) => typeof p === "string" ? { address: p } : p.placeId ? { placeId: p.placeId }
    : p.lat != null ? { location: { latLng: { latitude: p.lat, longitude: p.lon } } } : { address: p.text };
  async function post(body, mask) {
    const R = CONFIG.routing, G = R.google;
    if (!G.apiKey) throw new Error("google: apiKey belum diisi");
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), R.timeoutMs);
    try {
      const res = await fetch(G.endpoint, {
        method: "POST", signal: ctl.signal, referrerPolicy: "strict-origin-when-cross-origin",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": G.apiKey, "X-Goog-FieldMask": mask },
        body: JSON.stringify({ ...body, travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", regionCode: "ID", languageCode: "id" })
      });
      if (!res.ok) { // detail hanya untuk console/debug, tidak pernah ke pengguna
        let d = ""; try { const b = await res.json(); if (b.error) d = " " + (b.error.status || "") + " " + (b.error.message || ""); } catch (_) {}
        throw new Error("google: HTTP " + res.status + d);
      }
      return await res.json();
    } finally { clearTimeout(t); }
  }
  async function getRoute(origin, destination) {
    const r = ((await post({ origin: waypoint(origin), destination: waypoint(destination) }, "routes.distanceMeters,routes.duration")).routes || [])[0];
    if (!r || !(r.distanceMeters > 0)) throw new Error("google: rute tidak ditemukan");
    return { distanceKm: r.distanceMeters / 1000, durationMinutes: Math.round((parseFloat(r.duration) || 0) / 60), provider: "google", status: "success" };
  }
  // points = [asal, singgah..., tujuan akhir]. Satu panggilan, hasil per ruas (leg).
  async function getLegs(points) {
    const d = await post({ origin: waypoint(points[0]), destination: waypoint(points[points.length - 1]), intermediates: points.slice(1, -1).map(waypoint) },
      "routes.legs.distanceMeters,routes.legs.duration");
    const legs = (((d.routes || [])[0]) || {}).legs || [];
    if (legs.length !== points.length - 1) throw new Error("google: rincian rute tidak lengkap");
    const km = legs.map((l) => (l.distanceMeters || 0) / 1000);
    if (!(km.reduce((a, b) => a + b, 0) > 0)) throw new Error("google: rute tidak ditemukan");
    return { legsKm: km, legsMin: legs.map((l) => Math.round((parseFloat(l.duration) || 0) / 60)), provider: "google", status: "success" };
  }
  return { getRoute, getLegs };
})();
