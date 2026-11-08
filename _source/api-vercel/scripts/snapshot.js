// Daily snapshot used by GitHub Actions: fetches live data and writes JSON files into /data at the repo root.
// Run: node _source/api-vercel/scripts/snapshot.js
const fs = require("fs"), path = require("path");
const { buildMarket } = require("../api/_market");
const { getNews, getVideos, getEarnings, getFx } = require("../api/_feeds");
const { write, polish } = require("../api/_brief");
const OUT = path.resolve(__dirname, "../../../data");

async function step(name, fn) {
  try { const v = await fn(); console.log("✓", name); return v; }
  catch (e) { console.log("✗", name, e.message); return null; }
}
function save(file, obj) {
  if (!obj) return;
  if (obj.items && !obj.items.length) { console.log("  (skipped empty", file + ")"); return; }
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(obj));
}
(async () => {
  fs.mkdirSync(path.join(OUT, "briefs"), { recursive: true });
  const market = await step("market", buildMarket);
  const earnings = await step("earnings", getEarnings);
  save("market.json", market);
  save("earnings.json", earnings);
  save("news.json", await step("news", getNews));
  save("videos.json", await step("videos", getVideos));
  save("fx.json", await step("fx", getFx));
  if (market && market.items.length) {
    const brief = await polish(write(market, (earnings && earnings.items) || []));
    const day = (market.items[0].asOf || new Date().toISOString()).slice(0, 10);
    const data = { updated: new Date().toISOString(), date: day, marketAsOf: market.items[0].asOf, ...brief };
    fs.writeFileSync(path.join(OUT, "brief.json"), JSON.stringify(data));
    fs.writeFileSync(path.join(OUT, "briefs", day + ".json"), JSON.stringify(data));
    console.log("✓ brief", day);
  }
})();
