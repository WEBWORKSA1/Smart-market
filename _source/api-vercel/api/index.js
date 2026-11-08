const { send } = require("./_lib");
module.exports = (req, res) => send(res, 200, {
  name: "Smart.Market data API",
  endpoints: ["/api/market", "/api/news", "/api/videos", "/api/brief", "/api/earnings", "/api/fx", "POST /api/submit"],
  updated: new Date().toISOString()
}, 300);
