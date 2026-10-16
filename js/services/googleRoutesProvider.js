// PRIMARY. Google Routes API (Compute Routes). Hanya meminta distanceMeters + duration (tanpa traffic).
const GoogleRoutesProvider = (() => {
  // Titik bisa berupa teks bebas atau saran terpilih: placeId > koordinat > alamat teks.
  const waypoint = (p) => typeof p === "string" ? { address: p } : p.placeId ? { placeId: p.placeId }
    : p.lat != null ? { location: { latLng: { latitude: p.lat, longitude: p.lon } } } : { address: p.text };
  async function getRoute(origin, destination) {
    const R = CONFIG.routing, G = R.google;
    if (!G.apiKey) throw new Error("google: apiKey belum diisi");
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), R.timeoutMs);
    try {
      const res = await fetch(G.endpoint, {
        method: "POST", signal: ctl.signal, referrerPolicy: "strict-origin-when-cross-origin",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": G.apiKey, "X-Goog-FieldMask": "routes.distanceMeters,routes.duration" },
        body: JSON.stringify({ origin: waypoint(origin), destination: waypoint(destination),
          travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", regionCode: "ID", languageCode: "id" })
      });
      if (!res.ok) { // detail hanya untuk console/debug, tidak pernah ke pengguna
        let d = ""; try { const b = await res.json(); if (b.error) d = " " + (b.error.status || "") + " " + (b.error.message || ""); } catch (_) {}
        throw new Error("google: HTTP " + res.status + d);
      }
      const r = ((await res.json()).routes || [])[0];
      if (!r || !(r.distanceMeters > 0)) throw new Error("google: rute tidak ditemukan");
      return { distanceKm: r.distanceMeters / 1000, durationMinutes: Math.round((parseFloat(r.duration) || 0) / 60), provider: "google", status: "success" };
    } finally { clearTimeout(t); }
  }
  return { getRoute };
})();
