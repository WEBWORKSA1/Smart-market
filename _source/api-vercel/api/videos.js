const { send } = require("./_lib");
const { getVideos } = require("./_feeds");
let cache = null;
module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (cache && Date.now() - cache.at < 30 * 60 * 1000) return send(res, 200, cache.data, 3600);
  try {
    const data = await getVideos();
    if (!data || (data.items && !data.items.length)) return send(res, 503, { error: "temporarily_unavailable" }, 120);
    cache = { at: Date.now(), data };
    send(res, 200, data, 3600);
  } catch (e) { send(res, 500, { error: "failed" }, 60); }
};
