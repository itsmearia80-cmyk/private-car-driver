// Uji UI di DOM tiruan. Butuh jsdom: npm i jsdom, lalu: node tests-ui.js
const { JSDOM } = require("jsdom"), fs = require("fs"), os = require("os"), path = require("path");
let bad = 0; const ok = (n, c) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) bad = 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms)), js = (o, s = 200) => ({ ok: s < 400, status: s, json: async () => o });
const feat = (n, lon, lat) => ({ properties: { name: n, district: "Kebayoran Baru", city: "Jakarta Selatan", countrycode: "ID", osm_type: "N", osm_id: Math.floor(lon * 1000) }, geometry: { coordinates: [lon, lat] } });
async function load(dir, f, stub) {
  const dom = await JSDOM.fromFile(path.join(dir, f), { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
    beforeParse(w) { w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {}; w.__o = []; w.open = (u) => w.__o.push(u); if (stub) w.fetch = stub; } });
  await new Promise((r) => dom.window.addEventListener("load", r)); return dom.window;
}
const msgOf = (w) => decodeURIComponent((w.__o[0] || "").split("text=")[1] || "");
(async () => {
  const dir = __dirname; let w, d, $;
  // LANDING
  w = await load(dir, "index.html"); d = w.document; $ = (i) => d.getElementById(i);
  const hrefs = [...d.querySelectorAll("a")].map((a) => a.getAttribute("href"));
  ok("landing: links to book/package/delivery", ["book.html", "package.html", "delivery.html"].every((h) => hrefs.includes(h)));
  ok("landing: three choice cards, no form fields", d.querySelectorAll(".choice").length === 3 && d.querySelectorAll("form,input,select").length === 0);
  ok("landing: no Rp5.000/km, waiting from config", !/Rp5\.000/.test(d.body.textContent) && /Rp20\.000/.test(d.querySelector(".choices").textContent));
  ok("landing: English only (no Indonesian UI words)", !/(Pesan|Paket|Kembali|Beranda|Sopir|Tanya Jawab|Cara Kerja)/.test(d.body.textContent));
  ok("landing: delivery card shows minimum fare from config", /Minimum fare Rp40\.000/.test(d.querySelector(".choices").textContent));
  ok("landing: old passenger-only FAQ answer is gone", !/not a courier or delivery service/i.test(d.body.textContent));
  ok("landing: two vehicles (Calya for rides, Suzuki APV for delivery)", d.querySelectorAll(".vcard").length === 2 && /Suzuki APV/.test(d.getElementById("vehicle").textContent) && /Toyota Calya/.test(d.getElementById("vehicle").textContent));
  ok("landing: footer WhatsApp 6281573011713", $("waBottom").href.includes("wa.me/6281573011713"));
  w.close();
  // BOOK
  const stub = async (u) => u.includes("photon") ? js({ features: [feat("Petogogan", 106.80, -6.24), feat("Petogogan Raya", 106.81, -6.25)] }) : u.includes("nominatim") ? js([{ lat: "-6.2", lon: "106.8" }]) : js({ code: "Ok", routes: [{ distance: 10000, duration: 1500 }] });
  w = await load(dir, "book.html", stub); d = w.document; $ = (i) => d.getElementById(i); w.eval("CONFIG.routing.osrm.minGapMs = 0");
  ok("book: no service select, trip type present", !$("service") && d.querySelectorAll('input[name=tripType]').length === 2);
  const fill = () => { $("name").value = "Budi"; $("whatsapp").value = "08123456789"; $("date").value = "2099-01-01"; $("time").value = "08:00"; $("pickup").value = "Petogogan, Jakarta Selatan"; $("destination").value = "Bekasi"; $("passengers").value = "2"; $("waiting").value = "1"; };
  fill(); $("bookingForm").dispatchEvent(new w.Event("submit", { cancelable: true }));
  for (let i = 0; i < 40 && $("result").hidden; i++) await wait(50);
  ok("book: 10 km one way + 1h wait = Rp70.000", !$("result").hidden && /Rp70\.000/.test($("estimate").textContent));
  d.querySelector('input[value="round-trip"]').checked = true; $("bookingForm").dispatchEvent(new w.Event("input", { bubbles: true }));
  ok("book: round trip 10 km + 1h wait = Rp120.000", /Rp120\.000/.test($("estimate").textContent));
  $("sendBtn").click(); const m = msgOf(w);
  ok("book: WhatsApp to 6281573011713, fare + round trip, no Service line", (w.__o[0] || "").startsWith("https://wa.me/6281573011713") && /Rp120\.000/.test(m) && /Round Trip/.test(m) && !/Service:/.test(m));
  w.close();
  // BOOK + AUTOCOMPLETE
  w = await load(dir, "book.html", stub); d = w.document; $ = (i) => d.getElementById(i); w.eval("CONFIG.routing.osrm.minGapMs = 0");
  const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event("input", { bubbles: true })); };
  ok("autocomplete: combobox ARIA", $("pickup").getAttribute("role") === "combobox" && $("pickup").getAttribute("aria-controls") === "pickup-list");
  type($("pickup"), "Pe"); await wait(600); ok("autocomplete: no suggestions under 3 chars", $("pickup-list").hidden);
  type($("pickup"), "Petogogan"); await wait(700);
  ok("autocomplete: 2 suggestions + attribution", d.querySelectorAll("#pickup-list .ac-opt").length === 2 && /OpenStreetMap/.test($("pickup-list").textContent));
  d.querySelector("#pickup-list .ac-opt").dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  ok("autocomplete: choosing fills input + status", /Petogogan/.test($("pickup").value) && /selected/i.test($("pickup").parentNode.nextElementSibling.textContent));
  type($("destination"), "Petogogan Ra"); await wait(700);
  for (const k of ["ArrowDown", "ArrowDown", "Enter"]) $("destination").dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  ok("autocomplete: keyboard selection", /Petogogan Raya/.test($("destination").value));
  $("name").value = "Budi"; $("whatsapp").value = "08123456789"; $("date").value = "2099-01-01"; $("time").value = "08:00";
  const calls = []; w.fetch = async (u) => { calls.push(u); return stub(u); };
  $("bookingForm").dispatchEvent(new w.Event("submit", { cancelable: true })); for (let i = 0; i < 40 && $("result").hidden; i++) await wait(50);
  ok("autocomplete: route uses selected coordinates, 10 km = Rp50.000", /Rp50\.000/.test($("estimate").textContent) && calls.some((u) => u.includes("106.8,-6.24;106.81,-6.25")) && calls.every((u) => !u.includes("nominatim")));
  $("sendBtn").click(); ok("autocomplete: WhatsApp message has map links", /Peta Pickup: https:\/\/www\.google\.com\/maps/.test(msgOf(w)) && /Peta Destination: /.test(msgOf(w)));
  type($("pickup"), "Other"); ok("autocomplete: editing text clears the selection", $("pickup").parentNode.nextElementSibling.textContent === "" && $("result").hidden);
  w.close();
  // BOOK: routing gagal
  w = await load(dir, "book.html", async () => js({}, 500)); d = w.document; $ = (i) => d.getElementById(i); w.eval("CONFIG.routing.osrm.minGapMs = 0");
  $("name").value = "A"; $("whatsapp").value = "08123456789"; $("date").value = "2099-01-01"; $("time").value = "08:00"; $("pickup").value = "x"; $("destination").value = "y";
  $("bookingForm").dispatchEvent(new w.Event("submit", { cancelable: true })); for (let i = 0; i < 40 && $("result").hidden; i++) await wait(50);
  ok("book: routing failure -> no fare, English message", /To be confirmed/.test($("estimate").textContent) && /calculate the route/.test($("routeNote").textContent));
  w.close();
  // DELIVERY
  const rstub = (km) => async (u) => u.includes("photon") ? js({ features: [feat("Petogogan", 106.80, -6.24)] }) : u.includes("nominatim") ? js([{ lat: "-6.2", lon: "106.8" }]) : js({ code: "Ok", routes: [{ distance: km * 1000, duration: 1500 }] });
  const loadDv = async (km) => { const x = await load(dir, "delivery.html", rstub(km)); x.eval("CONFIG.routing.osrm.minGapMs = 0"); return x; };
  const fillDv = (x, size, weight) => { const g = (i) => x.document.getElementById(i);
    x.document.querySelector(`input[name=size][value=${size}]`).checked = true; g("dl-weight").value = weight; g("dl-desc").value = "Signed contract"; g("dl-confirm").checked = true;
    g("dl-date").value = "2099-01-01"; g("dl-time").value = "09:00"; g("dl-pickup").value = "Petogogan, Jakarta Selatan"; g("dl-dropoff").value = "Bekasi";
    g("dl-name").value = "Budi"; g("dl-whatsapp").value = "08123456789"; g("dl-rname").value = "Sari"; g("dl-rphone").value = "08129876543"; };
  const go = async (x) => { const g = (i) => x.document.getElementById(i); g("dvForm").dispatchEvent(new x.Event("submit", { cancelable: true })); for (let i = 0; i < 40 && g("dv-result").hidden; i++) await wait(50); };
  w = await loadDv(10); d = w.document; $ = (i) => d.getElementById(i);
  ok("delivery: shows the Suzuki APV photo", !!d.querySelector(".vstrip img[src=\"assets/delivery-car.webp\"]") && /Suzuki APV/.test(d.querySelector(".vstrip").textContent));
  ok("delivery: 5 size options, 5 weights, banned list, Delivery tab active", d.querySelectorAll("#sizeOpts input").length === 5 && $("dl-weight").options.length === 6 && d.querySelectorAll("#bannedList li").length === 3 && d.querySelector('.tabs a[aria-current="page"]').textContent === "Delivery");
  $("dvForm").dispatchEvent(new w.Event("submit", { cancelable: true }));
  ok("delivery: empty form shows errors, no WhatsApp", w.__o.length === 0 && $("de-size").textContent && $("de-name").textContent && $("de-rphone").textContent && $("de-confirm").textContent);
  fillDv(w, "small", "w5"); await go(w);
  ok("delivery: 10 km small parcel = Rp50.000", !$("dv-result").hidden && /Rp50\.000/.test($("dv-estimate").textContent) && !/Minimum fare applied/.test($("dv-estimate").textContent));
  d.querySelector('input[name=size][value=medium]').checked = true; $("dvForm").dispatchEvent(new w.Event("input", { bubbles: true }));
  ok("delivery: switching to medium adds Rp15.000 surcharge (Rp65.000)", /Rp65\.000/.test($("dv-estimate").textContent));
  d.querySelector('input[value="round-trip"]').checked = true; $("dvForm").dispatchEvent(new w.Event("input", { bubbles: true }));
  ok("delivery: round trip 10 km medium = Rp115.000", /Rp115\.000/.test($("dv-estimate").textContent));
  $("dv-send").click(); const dm = msgOf(w);
  ok("delivery: WhatsApp message has sender, recipient, size, drop-off, fare", (w.__o[0] || "").startsWith("https://wa.me/6281573011713") && /Pengirim: Budi/.test(dm) && /Penerima: Sari/.test(dm) && /Ukuran: Medium box/.test(dm) && /Drop-off: Bekasi/.test(dm) && /Rp115\.000/.test(dm));
  w.close();
  w = await loadDv(3); d = w.document; $ = (i) => d.getElementById(i); fillDv(w, "medium", "w5"); await go(w);
  ok("delivery: 3 km uses minimum fare, medium = Rp55.000", /Minimum fare applied/.test($("dv-estimate").textContent) && /Rp55\.000/.test($("dv-estimate").textContent));
  w.close();
  w = await loadDv(10); d = w.document; $ = (i) => d.getElementById(i); fillDv(w, "oversize", "w5"); const calls2 = []; const orig = w.fetch; w.fetch = async (u) => { calls2.push(u); return orig(u); }; await go(w);
  ok("delivery: oversize = custom quote, no routing calls, estimate hidden", !$("dv-result").hidden && $("dv-estPanel").hidden && calls2.length === 0 && /custom quote/.test($("dv-note").textContent));
  $("dv-send").click();
  ok("delivery: quote button text and message", /ASK FOR A QUOTE/.test($("dv-send").textContent) && /Perlu penawaran khusus/.test(msgOf(w)));
  w.close();
  w = await loadDv(10); d = w.document; $ = (i) => d.getElementById(i); fillDv(w, "small", "wmax"); await go(w);
  ok("delivery: weight over 30 kg also needs a custom quote", $("dv-estPanel").hidden);
  w.close();
  w = await load(dir, "delivery.html", async () => js({}, 500)); w.eval("CONFIG.routing.osrm.minGapMs = 0"); d = w.document; $ = (i) => d.getElementById(i); fillDv(w, "small", "w5"); await go(w);
  ok("delivery: routing failure -> no fare, English message", /To be confirmed/.test($("dv-estimate").textContent) && /calculate the route/.test($("dv-note").textContent));
  w.close();
  w = await loadDv(10); d = w.document; $ = (i) => d.getElementById(i); const typ = (el, v) => { el.value = v; el.dispatchEvent(new w.Event("input", { bubbles: true })); };
  typ($("dl-pickup"), "Petogogan"); await wait(700);
  ok("delivery: address suggestions work on this page", d.querySelectorAll("#dl-pickup-list .ac-opt").length === 1);
  w.close();
  // PACKAGE
  w = await load(dir, "package.html"); d = w.document; $ = (i) => d.getElementById(i);
  ok("package: 3 cards + area note", d.querySelectorAll("#pkgCards .pkg").length === 3 && /Karawang, Cisarua, and Banten/.test(d.body.textContent));
  d.querySelectorAll("#pkgCards .pkg")[0].querySelector("button").click();
  $("pk-name").value = "Sari"; $("pk-whatsapp").value = "08123456789"; $("pk-date").value = "2099-01-01"; $("pk-time").value = "07:00"; $("pk-pickup").value = "Depok"; $("pk-passengers").value = "4";
  $("pkgForm").dispatchEvent(new w.Event("submit", { cancelable: true })); const m2 = msgOf(w);
  ok("package: WhatsApp has 6 Hours Package, Rp350.000, 60 km", (w.__o[0] || "").startsWith("https://wa.me/6281573011713") && /6 Hours Package/.test(m2) && /Rp350\.000/.test(m2) && /60 km/.test(m2));
  w.close();
  w.close(); process.exit(bad);
})();
