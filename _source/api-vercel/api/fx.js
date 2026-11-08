const { send } = require("./_lib");
const { getFx } = require("./_feeds");
let cache = null;
module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (cache && Date.now() - cache.at < 3 * 3600 * 1000) return send(res, 200, cache.data, 10800);
  try {
    const data = await getFx();
    if (!data || (data.items && !data.items.length)) return send(res, 503, { error: "temporarily_unavailable" }, 120);
    cache = { at: Date.now(), data };
    send(res, 200, data, 10800);
  } catch (e) { send(res, 500, { error: "failed" }, 60); }
};
