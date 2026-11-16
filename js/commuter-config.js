// PRIVARO COMMUTER: SATU-SATUNYA tempat untuk rute, tarif, jadwal, hari operasi, dan paket Commuter.
// Edit di sini saja. Tanda PROVISIONAL = nilai sementara, belum diputuskan pemilik.
const COMMUTER = {
  enabled: false,                    // JANGAN ubah ke true sebelum izin, kendaraan, dan asuransi terverifikasi. false = "Coming Soon", booking ditolak.
  timezone: "Asia/Jakarta",          // harus Asia/Jakarta (WIB, tanpa DST)
  capacity: 5,                       // kursi maksimum per keberangkatan
  operatingDays: [1, 2, 3, 4, 5, 6], // 0=Minggu, 1=Senin ... 6=Sabtu
  blackoutDates: [],                 // tanggal libur/tidak beroperasi, format "2026-12-25"
  bookingCutoffHours: 12,            // PROVISIONAL: pemesanan ditutup sekian jam sebelum keberangkatan
  maxAdvanceDays: 30,                // PROVISIONAL: paling jauh sekian hari ke depan
  routes: [
    { id: "morning", code: "M", name: "Morning Commuter", origin: "The Garden Sawangan, Depok", destination: "MRT Blok M, South Jakarta",
      departureTime: "07:00", fare: 35000, enabled: true, mapUrl: "", // mapUrl: tautan Google Maps titik jemput (https://...), kosong = disembunyikan
      description: "Start your working day with a scheduled ride from Sawangan to MRT Blok M." },
    { id: "evening", code: "E", name: "Evening Commuter", origin: "SPBU Pertamina near Tebet Eco Park, South Jakarta", destination: "MRT Lebak Bulus, South Jakarta",
      departureTime: "19:00", fare: 30000, enabled: true, mapUrl: "",
      description: "A convenient scheduled ride from Tebet to MRT Lebak Bulus after your daily activities." }
  ],
  passes: [ // paket multi-trip: per rute, 1 kredit per perjalanan, kredit dicatat manual (belum otomatis)
    { id: "morning_5", route: "morning", trips: 5, price: 170000, validityDays: 30 },
    { id: "morning_10", route: "morning", trips: 10, price: 330000, validityDays: 30 },
    { id: "morning_20", route: "morning", trips: 20, price: 650000, validityDays: 30 },
    { id: "evening_5", route: "evening", trips: 5, price: 145000, validityDays: 30 },
    { id: "evening_10", route: "evening", trips: 10, price: 280000, validityDays: 30 },
    { id: "evening_20", route: "evening", trips: 20, price: 550000, validityDays: 30 }
  ]
};
if (typeof module !== "undefined") module.exports = COMMUTER;
