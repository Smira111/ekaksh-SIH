// Default / seed data for a fresh farm account.
// This mirrors the shape the frontend expects (same fields it used to
// keep in localStorage before the backend existed).
module.exports = function freshState() {
  return {
    farm: { name: "Green Pastures Farm", loc: "Anand, Gujarat", head: 42 },
    lang: "en",
    theme: "light",
    lastSync: null,
    stats: { milking: 0, treatments: 0 },
    gateways: [
      { n: "ESP32 Node — Parlour", s: "Online", t: "2s ago" },
      { n: "ESP32 Node — Maternity Pen A", s: "Online", t: "5s ago" },
      { n: "CCTV Feed — CAM-01", s: "Online", t: "live" },
      { n: "CCTV Feed — CAM-03", s: "Offline", t: "14m ago" },
      { n: "ESP32 Node — Pasture West", s: "Degraded", t: "48s ago" }
    ],
    cattle: [
      { id: 27, breed: "Holstein Friesian", dim: 128, lac: 3, cam: "YOLO CAM-01", risk: "hi", udder: 39.6, rum: 5.4, ec: 6.4, trend: [38.2, 38.6, 39.0, 39.4, 39.6], issue: "Subclinical Mastitis Risk", tags: ["EC Spike", "Rumination Drop", "Temp Elevated"], onset: 9, notes: ["Udder Temp +1.4°C", "Milk EC +22%", "Rumination -30%"], done: [] },
      { id: 104, breed: "Gir", dim: 64, lac: 2, cam: "YOLO CAM-02", risk: "ok", udder: 38.4, rum: 8.0, ec: 4.8, trend: [38.6, 38.3, 38.5, 38.2, 38.4], issue: null, tags: [], onset: null, notes: [], done: [] },
      { id: 15, breed: "Sahiwal", dim: 96, lac: 4, cam: "YOLO CAM-03", risk: "med", udder: 38.9, rum: 6.6, ec: 5.6, trend: [38.3, 38.6, 39.0, 38.8, 38.9], issue: "Elevated Udder Temp", tags: ["Temp Watch"], onset: 12, notes: ["Udder Temp +0.6°C"], done: [] },
      { id: 88, breed: "Crossbreed", dim: 152, lac: 2, cam: "YOLO CAM-04", risk: "ok", udder: 38.2, rum: 8.4, ec: 0, trend: [38.0, 38.3, 38.1, 38.4, 38.2], issue: null, tags: [], onset: null, notes: [], done: [] },
      { id: 42, breed: "Jersey", dim: 41, lac: 1, cam: "YOLO CAM-05", risk: "ok", udder: 38.3, rum: 8.1, ec: 4.9, trend: [38.0, 38.5, 38.6, 38.2, 38.3], issue: null, tags: [], onset: null, notes: [], done: [] },
      { id: 63, breed: "Sahiwal", dim: 210, lac: 5, cam: "YOLO CAM-06", risk: "hi", udder: 39.1, rum: 6.3, ec: 6.1, trend: [38.4, 38.7, 39.0, 39.3, 39.1], issue: "Milk Yield Drop", tags: ["Yield Drop", "EC Rise"], onset: 7, notes: ["Milk Yield -18%", "Milk EC +16%", "Udder Temp +0.7°C"], done: [] }
    ]
  };
};
