// SATU-SATUNYA tempat untuk mengubah nomor WhatsApp, tarif, dan info bisnis.
const CONFIG = {
  business: {
    name: "PRIVATE CAR + DRIVER",
    tagline: "Comfortable rides. Personal service.",
    operatingArea: "",  // isi bila sudah pasti, mis. "Jabodetabek". Kosong = tidak ditampilkan
    serviceHours: ""    // isi bila sudah pasti, mis. "Setiap hari, 05.00-22.00". Kosong = tidak ditampilkan
  },
  whatsapp: { driverNumber: "6281573011713" }, // GANTI sebelum deploy (format 62...)
  pricing: { pricePerKm: 4000, firstWaitingHour: 30000, additionalWaitingHour: 15000 },
  routing: {
    geocoderUrl: "https://nominatim.openstreetmap.org/search",
    fallbackGeocoderUrl: "https://photon.komoot.io/api/",
    routerUrls: [
      "https://router.project-osrm.org/route/v1/driving",
      "https://routing.openstreetmap.de/routed-car/route/v1/driving"
    ],
    countryCodes: "id",
    timeoutMs: 8000,
    minGapMs: 1100,   // Nominatim membatasi ~1 permintaan/detik
    longTripKm: 100
  },
  booking: { maxNotesLength: 500, maxPassengers: 8 }
};
