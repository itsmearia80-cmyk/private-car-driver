# Private Car + Driver, Booking Web V1
Situs statis (HTML + CSS + JS murni). Tanpa backend, database, atau build step.

## Wajib sebelum deploy
Edit `js/config.js`: ganti `driverNumber` (format `628xxxxxxxxxx`), cek tarif, dan isi `operatingArea` / `serviceHours` hanya jika sudah pasti.

## Jalankan lokal
    python3 -m http.server 8080   # buka http://localhost:8080
    node tests.js                 # tes pricing & validasi

## Deploy ke Cloudflare Pages
1. Push folder ini ke GitHub repo.
2. Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect to Git.
3. Framework preset: None. Build command: kosong. Output directory: `/`.
4. Deploy. Hasil di `https://<nama>.pages.dev`.
(Alternatif: Direct Upload, unggah folder ini langsung.)

## Batasan yang diketahui
- Geocoding/routing memakai server publik Nominatim & OSRM demo. Keduanya bukan untuk trafik produksi (Nominatim: maks. ~1 permintaan/detik, wajib atribusi OSM). Bila gagal, form tetap bisa dikirim dengan tarif "To be confirmed". Untuk trafik nyata, ganti `routerUrl`/`geocoderUrl` di `config.js` (butuh proxy bila provider memakai API key; jangan taruh key di frontend).
- Hasil geocoding adalah tebakan pertama pencarian; alamat ambigu bisa menghasilkan jarak keliru. Itu sebabnya selalu ada disclaimer "final fare confirmed by driver".
- Tol & parkir tidak dihitung. Tidak ada analytics.
