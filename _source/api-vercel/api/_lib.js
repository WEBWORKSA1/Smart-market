// Shared helpers for the Smart.Market data API (Vercel Node functions, no dependencies).
const UA = "Mozilla/5.0 (compatible; SmartMarketBot/1.0; +https://smart.market/about.html)";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function send(res, status, body, cacheSeconds) {
  cors(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (cacheSeconds) res.setHeader("Cache-Control", `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`);
  else res.setHeader("Cache-Control", "no-store");
  res.status(status).send(JSON.stringify(body));
}

async function get(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout || 9000);
  try {
    const r = await fetch(url, {
      redirect: "follow",
      ...opts,
      signal: ctrl.signal,
      headers: { "User-Agent": opts.browser ? BROWSER_UA : UA, Accept: opts.accept || "*/*", ...(opts.headers || {}) }
    });
    return r;
  } finally {
    clearTimeout(t);
  }
}

async function getText(url, opts) {
  const r = await get(url, opts);
  if (!r.ok) throw new Error(url + " -> " + r.status);
  return r.text();
}

async function getJSON(url, opts) {
  const r = await get(url, { accept: "application/json", ...opts });
  if (!r.ok) throw new Error(url + " -> " + r.status);
  return r.json();
}

// Run async tasks with limited concurrency.
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const k = i++;
      try { out[k] = await fn(items[k], k); } catch (e) { out[k] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function decode(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ").trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

// Minimal RSS 2.0 / RSS 1.0 (RDF) / Atom parser.
function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    let link = tag(b, "link");
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); if (m) link = m[1]; }
    if (!link) { const m = b.match(/rdf:about="([^"]+)"/i); if (m) link = m[1]; }
    const date = tag(b, "pubDate") || tag(b, "dc:date") || tag(b, "updated") || tag(b, "published");
    items.push({ title: tag(b, "title"), link: link.trim(), date: date ? new Date(date).toISOString() : null, summary: tag(b, "description").slice(0, 240) });
  }
  return items.filter(x => x.title && x.link && /^https?:\/\//.test(x.link));
}

module.exports = { cors, send, get, getText, getJSON, pool, parseFeed, decode, UA, BROWSER_UA };
