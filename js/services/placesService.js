// Saran alamat (autocomplete). Google Places (New) bila API key ada & berfungsi; jika tidak, otomatis Photon (OpenStreetMap).
// Biaya dijaga: min. karakter, debounce, batas permintaan Google per kunjungan, cache. Opsional ubah lewat CONFIG.places.
const PlacesService = (() => {
  const D = { enabled: true, minChars: 3, debounceMs: 400, maxSuggestions: 5, maxGoogleRequests: 12,
    googleUrl: "https://places.googleapis.com/v1/places:autocomplete", photonUrl: "https://photon.komoot.io/api/", biasLat: -6.2, biasLon: 106.8 };
  const P = () => Object.assign({}, D, CONFIG.places || {});
  let googleCalls = 0, googleOff = false;
  const cache = new Map();
  const newToken = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "t" + Date.now() + Math.random().toString(36).slice(2));

  async function getJSON(url, opts, signal) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), CONFIG.routing.timeoutMs);
    if (signal) signal.addEventListener("abort", () => ctl.abort());
    try {
      const r = await fetch(url, { ...opts, signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }
  async function google(q, token, signal) {
    const d = await getJSON(P().googleUrl, {
      method: "POST", referrerPolicy: "strict-origin-when-cross-origin",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": CONFIG.routing.google.apiKey },
      body: JSON.stringify({ input: q, sessionToken: token, includedRegionCodes: ["id"], languageCode: "id" })
    }, signal);
    return (d.suggestions || []).filter((s) => s.placePrediction).slice(0, P().maxSuggestions).map((s) => {
      const p = s.placePrediction, f = p.structuredFormat || {}, text = (p.text && p.text.text) || "";
      return { provider: "google", placeId: p.placeId, text, main: (f.mainText && f.mainText.text) || text, secondary: (f.secondaryText && f.secondaryText.text) || "" };
    });
  }
  async function photon(q, signal) {
    const d = await getJSON(`${P().photonUrl}?q=${encodeURIComponent(q)}&limit=10&lat=${P().biasLat}&lon=${P().biasLon}`, {}, signal);
    const seen = new Set();
    return (d.features || []).filter((f) => f.properties && f.properties.countrycode === "ID" && f.geometry).map((f) => {
      const p = f.properties, main = p.name || [p.street, p.housenumber].filter(Boolean).join(" ") || p.district || p.city || "";
      const parts = [p.street && p.street !== main ? p.street : "", p.district, p.city || p.county, p.state].filter(Boolean);
      const secondary = parts.filter((x, i) => parts.indexOf(x) === i && x !== main).join(", ");
      return { provider: "osm", id: (p.osm_type || "") + (p.osm_id || ""), text: secondary ? main + ", " + secondary : main, main, secondary, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
    }).filter((it) => it.main && !seen.has(it.text) && seen.add(it.text)).slice(0, P().maxSuggestions);
  }
  async function suggest(q, token, signal) {
    q = q.trim(); const k = q.toLowerCase(); if (cache.has(k)) return cache.get(k);
    let items = null, source = "osm";
    if (CONFIG.routing.google.apiKey && !googleOff && googleCalls < P().maxGoogleRequests) {
      googleCalls++;
      try { items = await google(q, token, signal); source = "google"; }
      catch (e) { if (e.name === "AbortError") throw e; googleOff = true; console.warn("[places] Google gagal, beralih ke OpenStreetMap:", e.message); }
    }
    if (!items) { try { items = await photon(q, signal); } catch (e) { if (e.name === "AbortError") throw e; console.warn("[places] OSM gagal:", e.message); items = []; } }
    const res = { items, source }; cache.set(k, res); return res;
  }
  // Tautan Google Maps (tanpa API key) agar driver langsung melihat titiknya.
  function mapsLink(sel) {
    if (!sel) return null;
    const b = "https://www.google.com/maps/search/?api=1&query=";
    if (sel.placeId) return b + encodeURIComponent(sel.text) + "&query_place_id=" + encodeURIComponent(sel.placeId);
    if (sel.lat != null) return b + sel.lat + "," + sel.lon;
    return null;
  }
  return { suggest, newToken, mapsLink, enabled: () => P().enabled, minChars: () => P().minChars, debounceMs: () => P().debounceMs };
})();
