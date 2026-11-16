# Privaro - Private Ride. Personal Driver. (Booking Web V1.1)
Situs statis multi-halaman: `index.html` (landing), `book.html` (Book Your Ride), `package.html` (PRIVATE CAR + Driver PACKAGE). Tanpa backend atau database.

## Wajib sebelum deploy (`js/config.js`)
- `whatsapp.driverNumber`: nomor driver, format `628xxxxxxxxxx`.
- `pricing`: tarif saat ini Rp5.000/km, waiting jam pertama Rp20.000, tambahan Rp10.000/jam.
- `routing.google.apiKey`: opsional tetapi disarankan. Key HARUS dibatasi HTTP referrer + hanya Routes API. Kosong = langsung memakai OSRM.

## Routing
Google Routes API (primary) lalu OSRM (fallback), dengan objek hasil yang seragam `{distanceKm, durationMinutes, provider, status}`. Ganti `primary`/`fallback`/`enableFallback` di config tanpa mengubah kode lain. Jika semua gagal, tarif tidak dihitung dan pengguna diarahkan memeriksa alamat atau kirim via WhatsApp.

## Tes
    node tests.js           # pricing & validasi
    node tests-routing.js   # logika provider & fallback (fetch palsu)

## Batasan
- OSRM/Nominatim/Photon adalah server publik gratis: tanpa jaminan kapasitas, hanya fallback/development.
- Tol & parkir tidak termasuk estimasi.
- Tarif Google mengikuti kebijakan pay-as-you-go yang bisa berubah. Verifikasi di dokumentasi resmi Google sebelum produksi.
- UI tests: `npm i jsdom` then `node tests-ui.js`.

## Delivery service
- Page: `delivery.html` (UI in `js/delivery.js`). Prices, size classes, weight options and the banned-items list live in `js/delivery-pricing.js` (config.js is not touched).
- Formula: `max(minFare, baseFare + distance x pricePerKm) + size surcharge`. Round trip doubles the distance. Items marked "bigger than Large" or over 30 kg get a custom quote via WhatsApp (no route call).
- Current values are the owner's confirmed starting values: Rp5.000/km, minimum fare Rp40.000, size surcharges Document Rp0, Small Rp0, Medium Rp0, Large Rp25.000. Size limits and the banned list are provisional.
- Tests: `node tests-delivery.js` (formula), `node tests-ui.js` (needs jsdom).

## PRIVARO COMMUTER
- Page: `commuter.html`. Semua rute, tarif, jadwal, hari operasi, cutoff, dan paket ada di `js/commuter-config.js` (satu-satunya tempat edit). Logika di `js/commuter-logic.js`, UI di `js/commuter.js`.
- `enabled: false` (default) = tampil "Coming Soon" dan booking ditolak. Ubah ke `true` hanya setelah izin, kendaraan, dan asuransi terverifikasi.
- Booking = permintaan WhatsApp yang dikonfirmasi manual (status selalu pending_confirmation). Tanpa database, tanpa seat availability otomatis. Setiap permintaan memuat kode `Ref` untuk pencatatan manual.
- Nilai PROVISIONAL (belum diputuskan pemilik): `bookingCutoffHours`, `maxAdvanceDays`, `blackoutDates`, `mapUrl` titik jemput.
- Tes: `node tests-commuter.js`.
