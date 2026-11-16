// node tests-commuter.js  (logika Commuter, tanpa DOM)
global.CONFIG = { whatsapp: { driverNumber: "6281234567890" }, booking: { maxNotesLength: 500 } };
global.PricingService = require("./js/services/pricingService.js"); global.Validation = require("./js/utils/validation.js");
global.WhatsAppService = require("./js/services/whatsappService.js"); global.COMMUTER = require("./js/commuter-config.js");
const L = require("./js/commuter-logic.js"), M = COMMUTER.routes[0], E = COMMUTER.routes[1];
let bad = 0; const ok = (n, c) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) bad++; };
const NOW = Date.UTC(2026, 10, 16, 3, 0); // Senin 16 Nov 2026 10:00 WIB
const inp = (o) => Object.assign({ routeId: "morning", date: "2026-11-18", seats: 2, name: "John Doe", whatsapp: "08123456789", notes: "" }, o);
COMMUTER.enabled = true;
ok("config valid", L.configProblems().length === 0);
ok("morning 2 seats = Rp70.000", L.build(inp(), NOW).booking.total === 70000);
ok("evening 3 seats = Rp90.000", L.build(inp({ routeId: "evening", seats: 3 }), NOW).booking.total === 90000);
ok("seats 0 / 6 / 1.5 rejected", [0, 6, 1.5].every((s) => L.build(inp({ seats: s }), NOW).errors.seats));
ok("Sunday rejected, Monday accepted", L.dateError(M, "2026-11-22", NOW) && !L.dateError(M, "2026-11-23", NOW));
ok("past date rejected", L.dateError(M, "2026-11-15", NOW) !== "");
ok("invalid dates rejected", ["", "2026-02-30", "17/11/2026", "2026-13-01"].every((d) => L.dateError(M, d, NOW)));
const N2 = Date.UTC(2026, 10, 16, 13, 0); // 20:00 WIB: cutoff 12 jam sebelum 07:00 sudah lewat
ok("cutoff: morning next day closed, evening next day open", L.dateError(M, "2026-11-17", N2) && !L.dateError(E, "2026-11-17", N2));
ok("Jakarta date, not device date (18:00Z = 01:00 WIB next day)", L.todayISO(Date.UTC(2026, 10, 16, 18, 0)) === "2026-11-17");
ok("available dates never include Sunday", L.availableDates(M, NOW).every((d) => new Date(d + "T00:00:00Z").getUTCDay() !== 0));
COMMUTER.blackoutDates = ["2026-11-18"]; ok("blackout date rejected", L.dateError(M, "2026-11-18", NOW) !== ""); COMMUTER.blackoutDates = [];
const b = L.build(inp({ name: "Budi & Co\n#1", notes: "a&b=c\r\nline" }), NOW).booking, msg = L.message(b), url = WhatsAppService.buildUrl(msg);
ok("message uses actual form values", /Nama: Budi & Co #1/.test(msg) && /Total: Rp70\.000/.test(msg) && /Jumlah Kursi: 2/.test(msg) && /Rute: The Garden Sawangan/.test(msg) && /Tanggal: .*18 November 2026/.test(msg) && !/John Doe/.test(msg));
ok("WhatsApp URL well-formed (no raw & # newline in text)", url.startsWith("https://wa.me/6281234567890?text=") && !/[\n#]/.test(url) && url.split("?text=")[1].split("&").length === 1);
ok("booking is pending_confirmation, ref present", b.status === "pending_confirmation" && /^PVC-20261118-M[A-Z0-9]{4}$/.test(b.ref));
ok("phone normalized to 62...", b.whatsapp === "628123456789");
COMMUTER.enabled = false; ok("disabled service rejects bookings", !!L.build(inp(), NOW).errors.form && !L.build(inp(), NOW).booking);
COMMUTER.enabled = true; COMMUTER.routes[0].fare = -1; ok("bad config detected", L.configProblems().length > 0);
process.exit(bad ? 1 : 0);
