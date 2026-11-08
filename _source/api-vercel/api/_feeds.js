// Feed collectors shared by the API endpoints and the GitHub Actions snapshot script.
const { getText, getJSON, pool, parseFeed, decode } = require("./_lib");
const FEEDS = [
  ["MarketWatch", "https://feeds.content.dowjones.io/public/rss/mw_topstories", "Markets"],
  ["CNBC", "https://www.cnbc.com/id/100003114/device/rss/rss.html", "Markets"],
  ["CNBC Markets", "https://www.cnbc.com/id/10000664/device/rss/rss.html", "Markets"],
  ["Investing.com", "https://www.investing.com/rss/news_25.rss", "Stocks"],
  ["Nasdaq", "https://www.nasdaq.com/feed/rssoutbound?category=Markets", "Stocks"],
  ["Yahoo Finance", "https://finance.yahoo.com/news/rssindex", "Markets"],
  ["Federal Reserve", "https://www.federalreserve.gov/feeds/press_all.xml", "Policy"],
  ["U.S. SEC", "https://www.sec.gov/news/pressreleases.rss", "Regulation"],
  ["Bank of Canada", "https://www.bankofcanada.ca/content_type/press-releases/feed/", "Policy"],
  ["Economic Times", "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", "India"],
  ["CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/", "Crypto"]
];
async function getNews() {
  const results = await pool(FEEDS, 6, async ([source, url, topic]) => {
    const xml = await getText(url, { browser: true, timeout: 8000 });
    return parseFeed(xml).slice(0, 25).map(x => ({ ...x, source, topic }));
  });
  const week = Date.now() - 7 * 864e5, seen = new Set(), items = [];
  results.flat().filter(Boolean).forEach(x => {
    const key = x.title.toLowerCase().slice(0, 70);
    if (seen.has(key)) return;
    if (x.date && Date.parse(x.date) < week) return;
    seen.add(key); items.push(x);
  });
  items.sort((a, b) => (Date.parse(b.date || 0) || 0) - (Date.parse(a.date || 0) || 0));
  return { updated: new Date().toISOString(), sources: FEEDS.map(f => f[0]), count: items.length, items: items.slice(0, 80) };
}
// Public finance-education channels (embeds are served by YouTube). Add your own channel via YT_CHANNELS env (comma-separated IDs).
const CHANNELS = [
  "UCEAZeUIeJs0IjQiqTCdVSIg", "UCrp_UI8XtuYfpiqluWLD7Lw", "UCIALMKvObZNtJ6AmdCLP7Lg", "UCDXTQ8nWmx_EhZ2v-kp7QxA",
  "UCFCEuCsyWP0YkP3CZ3Mr01Q", "UCK7tptUDHh-RYDsdxO1-5QQ", "UCV6KDgJskWaEckne5aPA0aQ", "UCnMn36GT_H0X-w5_ckLtlgQ"
];
async function getVideos() {
  const own = (process.env.YT_CHANNELS || "").split(",").map(s => s.trim()).filter(Boolean);
  const ids = [...own, ...CHANNELS];
  const feeds = await pool(ids, 6, async (id) => {
    const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, { timeout: 8000 });
    const channel = decode((xml.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    return entries.slice(0, 6).map(e => ({
      id: (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1],
      title: decode((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
      published: (e.match(/<published>([^<]+)<\/published>/) || [])[1],
      channel, channelId: id, own: own.includes(id)
    })).filter(v => v.id && !/#shorts/i.test(v.title));
  });
  const all = feeds.flat().filter(Boolean);
  const mine = all.filter(v => v.own), rest = all.filter(v => !v.own).sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  return { updated: new Date().toISOString(), channels: [...new Set(all.map(v => v.channel))], items: [...mine, ...rest].slice(0, 36) };
}
function nextWeekdays(n) {
  const out = []; const d = new Date();
  while (out.length < n) { const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}
async function getEarnings() {
  const days = nextWeekdays(6), rows = [];
  for (const day of days) {
    try {
      const j = await getJSON(`https://api.nasdaq.com/api/calendar/earnings?date=${day}`, { browser: true, headers: { Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" } });
      for (const r of ((j.data && j.data.rows) || [])) {
        const cap = +(String(r.marketCap || "").replace(/[$,]/g, "")) || 0;
        rows.push({ date: day, sym: r.symbol, name: r.name, time: r.time === "time-pre-market" ? "Before open" : r.time === "time-after-hours" ? "After close" : "—", eps: r.epsForecast || "", cap });
      }
    } catch (e) { }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || b.cap - a.cap);
  const top = []; const perDay = {};
  for (const r of rows) { perDay[r.date] = (perDay[r.date] || 0) + 1; if (perDay[r.date] <= 12) top.push(r); }
  return { updated: new Date().toISOString(), source: "Nasdaq earnings calendar", items: top };
}
async function getFx() {
  let j = null;
  for (const u of ["https://api.frankfurter.dev/v1/latest?base=USD", "https://api.frankfurter.app/latest?from=USD"]) {
    try { j = await getJSON(u); if (j && j.rates) break; } catch (e) {}
  }
  if (!j || !j.rates) return null;
  return { updated: new Date().toISOString(), date: j.date, base: "USD", source: "European Central Bank reference rates via Frankfurter", rates: { USD: 1, ...j.rates } };
}
module.exports = { getNews, getVideos, getEarnings, getFx, FEEDS, CHANNELS };
