const { send } = require("./_lib");
const { buildMarket } = require("./_market");
module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  try {
    const data = await buildMarket();
    if (!data.items.length) return send(res, 503, { error: "Market data temporarily unavailable" }, 60);
    send(res, 200, data, 1800);
  } catch (e) { send(res, 500, { error: "market_failed" }, 60); }
};
