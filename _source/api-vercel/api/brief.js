// Daily market brief endpoint (see _brief.js for the writer).
const { send } = require("./_lib");
const { buildMarket } = require("./_market");
const { getEarnings } = require("./_feeds");
const { write, polish } = require("./_brief");
let cache = null;
module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (cache && Date.now() - cache.at < 20 * 60 * 1000) return send(res, 200, cache.data, 1800);
  try {
    const m = await buildMarket();
    let earnings = [];
    try { earnings = (await getEarnings()).items || []; } catch (e) {}
    const brief = await polish(write(m, earnings));
    const data = { updated: new Date().toISOString(), marketAsOf: m.items[0] && m.items[0].asOf, ...brief };
    cache = { at: Date.now(), data };
    send(res, 200, data, 1800);
  } catch (e) { send(res, 500, { error: "brief_failed" }, 60); }
};
