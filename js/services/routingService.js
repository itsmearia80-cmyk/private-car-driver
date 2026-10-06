// Pricing hanya memakai distanceKm; provider peta bisa diganti di sini tanpa menyentuh pricing.
const RoutingService = (() => {
  const R = () => CONFIG.routing;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastNominatim = 0;

  async function getJSON(url) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), R().timeoutMs);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status + " " + url.split("?")[0]);
      return await res.json();
    } finally { clearTimeout(t); }
  }
  const providers = [
    async (q) => { // Nominatim: permintaan harus berurutan, jeda >= 1 detik
      const wait = lastNominatim + R().minGapMs - Date.now(); if (wait > 0) await sleep(wait);
      lastNominatim = Date.now();
      const d = await getJSON(`${R().geocoderUrl}?format=jsonv2&limit=1&countrycodes=${R().countryCodes}&q=${encodeURIComponent(q)}`);
      return d.length ? { lat: +d[0].lat, lon: +d[0].lon } : null;
    },
    async (q) => { // Photon (cadangan)
      const d = await getJSON(`${R().fallbackGeocoderUrl}?limit=1&q=${encodeURIComponent(q + ", Indonesia")}`);
      const c = d.features && d.features[0] && d.features[0].geometry.coordinates;
      return c ? { lat: c[1], lon: c[0] } : null;
    }
  ];
  function variants(q) { // alamat lengkap dulu; bila tidak ketemu, coba bagian terakhir (perkiraan)
    const p = q.split(",").map((s) => s.trim()).filter(Boolean), v = [{ q, approx: false }];
    if (p.length > 2) v.push({ q: p.slice(-2).join(", "), approx: true });
    return v;
  }
  async function geocode(query) {
    for (const prov of providers) {
      try {
        for (const v of variants(query)) { const hit = await prov(v.q); if (hit) return { ...hit, approx: v.approx }; }
      } catch (e) { console.warn("[routing] geocoder gagal:", e.message); }
    }
    throw new Error("geocode failed: " + query);
  }
  async function route(a, b) {
    let last;
    for (const base of R().routerUrls) {
      try {
        const d = await getJSON(`${base}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`);
        if (d.code === "Ok" && d.routes && d.routes.length) return { distanceKm: d.routes[0].distance / 1000, durationMinutes: Math.round(d.routes[0].duration / 60) };
        last = new Error("OSRM code " + d.code);
      } catch (e) { last = e; console.warn("[routing] router gagal:", e.message); }
    }
    throw last || new Error("no route");
  }
  async function getRouteDistance(origin, destination) {
    const a = await geocode(origin), b = await geocode(destination); // berurutan, bukan paralel
    const r = await route(a, b);
    return { ...r, approximate: a.approx || b.approx };
  }
  return { getRouteDistance };
})();
if (typeof module !== "undefined") module.exports = RoutingService;
