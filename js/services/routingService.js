// Pricing hanya memakai distanceKm; provider peta bisa diganti di sini tanpa menyentuh pricing.
const RoutingService = (() => {
  const R = () => CONFIG.routing;
  async function getJSON(url) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), R().timeoutMs);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally { clearTimeout(t); }
  }
  async function geocode(query) {
    const u = `${R().geocoderUrl}?format=jsonv2&limit=1&countrycodes=${R().countryCodes}&q=${encodeURIComponent(query)}`;
    const data = await getJSON(u);
    if (!data.length) throw new Error("not found");
    return { lat: +data[0].lat, lon: +data[0].lon };
  }
  async function getRouteDistance(origin, destination) {
    const [a, b] = await Promise.all([geocode(origin), geocode(destination)]);
    const data = await getJSON(`${R().routerUrl}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`);
    if (data.code !== "Ok" || !data.routes?.length) throw new Error("no route");
    return { distanceKm: data.routes[0].distance / 1000, durationMinutes: Math.round(data.routes[0].duration / 60) };
  }
  return { getRouteDistance };
})();
