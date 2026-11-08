// Market data engine: Yahoo Finance chart API (primary) with Stooq CSV fallback.
const { getJSON, getText, get, pool, BROWSER_UA } = require("./_lib");

// [display symbol, name, class, yahoo symbol, stooq symbol, sector]
const UNIVERSE = [
  ["SPX","S&P 500","index","^GSPC","^spx"],["NDX","Nasdaq 100","index","^NDX","^ndx"],["DJI","Dow Jones","index","^DJI","^dji"],
  ["RUT","Russell 2000","index","^RUT",""],["TSX","S&P/TSX Composite","index","^GSPTSE",""],["FTSE","FTSE 100","index","^FTSE","^ukx"],
  ["DAX","DAX 40","index","^GDAXI","^dax"],["N225","Nikkei 225","index","^N225","^nkx"],["SENSEX","BSE Sensex","index","^BSESN",""],["VIX","VIX Volatility","index","^VIX",""],
  ["BTC","Bitcoin","crypto","BTC-USD","btcusd"],["ETH","Ethereum","crypto","ETH-USD","ethusd"],["SOL","Solana","crypto","SOL-USD",""],
  ["XRP","XRP","crypto","XRP-USD",""],["BNB","BNB","crypto","BNB-USD",""],["DOGE","Dogecoin","crypto","DOGE-USD",""],
  ["GC","Gold (per oz)","commodity","GC=F","gc.f"],["SI","Silver (per oz)","commodity","SI=F","si.f"],["CL","WTI Crude Oil","commodity","CL=F","cl.f"],
  ["BZ","Brent Crude Oil","commodity","BZ=F","cb.f"],["NG","Natural Gas","commodity","NG=F","ng.f"],["HG","Copper (per lb)","commodity","HG=F","hg.f"],
  ["EURUSD","EUR/USD","fx","EURUSD=X","eurusd"],["GBPUSD","GBP/USD","fx","GBPUSD=X","gbpusd"],["USDJPY","USD/JPY","fx","JPY=X","usdjpy"],
  ["USDCAD","USD/CAD","fx","CAD=X","usdcad"],["USDINR","USD/INR","fx","INR=X","usdinr"],["AUDUSD","AUD/USD","fx","AUDUSD=X","audusd"],
  ["US3M","US 13-Week T-Bill","bond","^IRX",""],["US5Y","US 5-Year Yield","bond","^FVX",""],["US10Y","US 10-Year Yield","bond","^TNX",""],["US30Y","US 30-Year Yield","bond","^TYX",""],
  ["AAPL","Apple","stock","AAPL","aapl.us","Technology"],["MSFT","Microsoft","stock","MSFT","msft.us","Technology"],["NVDA","NVIDIA","stock","NVDA","nvda.us","Technology"],
  ["GOOGL","Alphabet","stock","GOOGL","googl.us","Communication"],["AMZN","Amazon","stock","AMZN","amzn.us","Consumer Disc."],["META","Meta Platforms","stock","META","meta.us","Communication"],
  ["AVGO","Broadcom","stock","AVGO","avgo.us","Technology"],["TSLA","Tesla","stock","TSLA","tsla.us","Consumer Disc."],["BRK.B","Berkshire Hathaway","stock","BRK-B","brk-b.us","Financials"],
  ["JPM","JPMorgan Chase","stock","JPM","jpm.us","Financials"],["V","Visa","stock","V","v.us","Financials"],["LLY","Eli Lilly","stock","LLY","lly.us","Healthcare"],
  ["UNH","UnitedHealth","stock","UNH","unh.us","Healthcare"],["XOM","Exxon Mobil","stock","XOM","xom.us","Energy"],["CVX","Chevron","stock","CVX","cvx.us","Energy"],
  ["WMT","Walmart","stock","WMT","wmt.us","Consumer Staples"],["COST","Costco","stock","COST","cost.us","Consumer Staples"],["PG","Procter & Gamble","stock","PG","pg.us","Consumer Staples"],
  ["KO","Coca-Cola","stock","KO","ko.us","Consumer Staples"],["PEP","PepsiCo","stock","PEP","pep.us","Consumer Staples"],["JNJ","Johnson & Johnson","stock","JNJ","jnj.us","Healthcare"],
  ["ABBV","AbbVie","stock","ABBV","abbv.us","Healthcare"],["MRK","Merck","stock","MRK","mrk.us","Healthcare"],["HD","Home Depot","stock","HD","hd.us","Consumer Disc."],
  ["MCD","McDonald's","stock","MCD","mcd.us","Consumer Disc."],["NKE","Nike","stock","NKE","nke.us","Consumer Disc."],["BAC","Bank of America","stock","BAC","bac.us","Financials"],
  ["GS","Goldman Sachs","stock","GS","gs.us","Financials"],["MA","Mastercard","stock","MA","ma.us","Financials"],["ORCL","Oracle","stock","ORCL","orcl.us","Technology"],
  ["CRM","Salesforce","stock","CRM","crm.us","Technology"],["AMD","Advanced Micro Devices","stock","AMD","amd.us","Technology"],["ADBE","Adobe","stock","ADBE","adbe.us","Technology"],
  ["NFLX","Netflix","stock","NFLX","nflx.us","Communication"],["DIS","Walt Disney","stock","DIS","dis.us","Communication"],["CAT","Caterpillar","stock","CAT","cat.us","Industrials"],
  ["GE","GE Aerospace","stock","GE","ge.us","Industrials"],["BA","Boeing","stock","BA","ba.us","Industrials"],["UPS","United Parcel Service","stock","UPS","ups.us","Industrials"],
  ["NEE","NextEra Energy","stock","NEE","nee.us","Utilities"],["DUK","Duke Energy","stock","DUK","duk.us","Utilities"],["PLD","Prologis","stock","PLD","pld.us","Real Estate"],
  ["O","Realty Income","stock","O","o.us","Real Estate"],["LIN","Linde","stock","LIN","lin.us","Materials"],["SHOP","Shopify","stock","SHOP","shop.us","Technology"],
  ["RY","Royal Bank of Canada","stock","RY","ry.us","Financials"],["PLTR","Palantir","stock","PLTR","pltr.us","Technology"],["COIN","Coinbase","stock","COIN","coin.us","Financials"]
];

async function yahooChart(ysym) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ysym)}?range=1y&interval=1d&includePrePost=false`;
  let j;
  try { j = await getJSON(u, { browser: true }); }
  catch (e) { j = await getJSON(u.replace("query1", "query2"), { browser: true }); }
  const r = j && j.chart && j.chart.result && j.chart.result[0];
  if (!r) throw new Error("no chart");
  const ts = r.timestamp || [], cl = (r.indicators.quote[0] || {}).close || [], vol = (r.indicators.quote[0] || {}).volume || [];
  const rows = [];
  for (let i = 0; i < ts.length; i++) if (cl[i] != null) rows.push({ t: ts[i] * 1000, c: cl[i], v: vol[i] || 0 });
  return { rows, price: r.meta.regularMarketPrice, time: (r.meta.regularMarketTime || 0) * 1000, currency: r.meta.currency };
}

async function stooqDaily(ssym) {
  if (!ssym) throw new Error("no stooq symbol");
  const csv = await getText(`https://stooq.com/q/d/l/?s=${encodeURIComponent(ssym)}&i=d`, { browser: true });
  const lines = csv.trim().split(/\r?\n/).slice(1).slice(-260);
  const rows = lines.map(l => { const p = l.split(","); return { t: Date.parse(p[0]), c: +p[4], v: +(p[5] || 0) }; }).filter(x => x.c > 0);
  if (!rows.length) throw new Error("empty stooq");
  return { rows, price: rows[rows.length - 1].c, time: rows[rows.length - 1].t };
}

// Yahoo quote endpoint needs a cookie + crumb; best effort for fundamentals.
async function yahooFundamentals(ysyms) {
  try {
    const r1 = await get("https://fc.yahoo.com", { browser: true, redirect: "manual" });
    const cookie = (r1.headers.get("set-cookie") || "").split(";")[0];
    const crumb = await (await get("https://query2.finance.yahoo.com/v1/test/getcrumb", { browser: true, headers: { cookie } })).text();
    if (!crumb || crumb.length > 40 || /</.test(crumb)) return {};
    const out = {};
    for (let i = 0; i < ysyms.length; i += 40) {
      const batch = ysyms.slice(i, i + 40).join(",");
      const j = await getJSON(`https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(batch)}&crumb=${encodeURIComponent(crumb)}`, { browser: true, headers: { cookie } });
      for (const q of (j.quoteResponse && j.quoteResponse.result) || []) {
        out[q.symbol] = {
          mcap: q.marketCap ? q.marketCap / 1e9 : null,
          pe: q.trailingPE || null,
          fpe: q.forwardPE || null,
          eps: q.epsTrailingTwelveMonths || null,
          div: q.trailingAnnualDividendYield != null ? q.trailingAnnualDividendYield * 100 : (q.dividendYield || null),
          prev: q.regularMarketPreviousClose || null
        };
      }
    }
    return out;
  } catch (e) { return {}; }
}

function pctFrom(rows, cutoff) {
  const base = rows.find(r => r.t >= cutoff);
  const last = rows[rows.length - 1];
  return base && base.c ? (last.c / base.c - 1) * 100 : null;
}

// Return since the last close before `cutoff` (true month-to-date / period return).
function pctFromPrevClose(rows, cutoff) {
  let base = null;
  for (const r of rows) { if (r.t < cutoff) base = r; else break; }
  const last = rows[rows.length - 1];
  return base && base.c ? (last.c / base.c - 1) * 100 : null;
}

let cache = null;

async function buildMarket() {
  if (cache && Date.now() - cache.at < 15 * 60 * 1000) return cache.data;
  const series = await pool(UNIVERSE, 12, async (u) => {
    try { return await yahooChart(u[3]); }
    catch (e) { try { return Object.assign(await stooqDaily(u[4]), { source: "stooq" }); } catch (e2) { return null; } }
  });
  const fund = await yahooFundamentals(UNIVERSE.filter(u => u[2] === "stock").map(u => u[3]));
  const spx = series[0];
  const spxRet = {};
  if (spx) for (let i = 1; i < spx.rows.length; i++) spxRet[new Date(spx.rows[i].t).toISOString().slice(0, 10)] = spx.rows[i].c / spx.rows[i - 1].c - 1;
  const now = new Date();
  const ytd = Date.UTC(now.getUTCFullYear(), 0, 1), mtdStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1), m1 = Date.now() - 30 * 864e5, y1 = Date.now() - 365 * 864e5;
  const items = [];
  UNIVERSE.forEach((u, k) => {
    const s = series[k];
    if (!s || !s.rows.length) return;
    const rows = s.rows;
    let price = s.price || rows[rows.length - 1].c;
    const lastDay = new Date(rows[rows.length - 1].t).toISOString().slice(0, 10);
    const priceDay = new Date(s.time || rows[rows.length - 1].t).toISOString().slice(0, 10);
    let prev = lastDay === priceDay ? (rows[rows.length - 2] || rows[0]).c : rows[rows.length - 1].c;
    const f = fund[u[3]] || {};
    if (f.prev && u[2] === "stock") prev = f.prev;
    const closes = rows.map(r => r.c);
    // beta vs S&P 500 (1y daily)
    let beta = null;
    if (u[2] === "stock" && spx) {
      const xs = [], ys = [];
      for (let i = 1; i < rows.length; i++) {
        const d = new Date(rows[i].t).toISOString().slice(0, 10);
        if (spxRet[d] != null) { xs.push(spxRet[d]); ys.push(rows[i].c / rows[i - 1].c - 1); }
      }
      if (xs.length > 60) {
        const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
        let cov = 0, vx = 0;
        for (let i = 0; i < xs.length; i++) { cov += (xs[i] - mx) * (ys[i] - my); vx += (xs[i] - mx) ** 2; }
        beta = vx ? cov / vx : null;
      }
    }
    const avgVol = rows.slice(-20).reduce((a, r) => a + (r.v || 0), 0) / Math.min(20, rows.length);
    items.push({
      sym: u[0], name: u[1], cls: u[2], sector: u[5] || null,
      price: +price.toFixed(6), prev: +prev.toFixed(6), chgPct: prev ? +(((price / prev) - 1) * 100).toFixed(3) : 0,
      hist: closes.slice(-60).map(v => +v.toFixed(4)),
      hist1y: closes.filter((_, i) => i % 5 === 0 || i === closes.length - 1).map(v => +v.toFixed(4)),
      hi52: Math.max(...closes), lo52: Math.min(...closes),
      r1m: pctFrom(rows, m1), mtd: pctFromPrevClose(rows, mtdStart), rytd: pctFrom(rows, ytd), r1y: pctFrom(rows, y1),
      beta: beta != null ? +beta.toFixed(2) : null,
      vol: Math.round(avgVol),
      mcap: f.mcap != null ? +f.mcap.toFixed(1) : null, pe: f.pe != null ? +f.pe.toFixed(1) : null,
      fpe: f.fpe != null ? +f.fpe.toFixed(1) : null, div: f.div != null ? +f.div.toFixed(2) : null,
      asOf: new Date(s.time || rows[rows.length - 1].t).toISOString(),
      src: s.source || "yahoo"
    });
  });
  const data = { updated: new Date().toISOString(), count: items.length, note: "Prices may be delayed. Refreshed automatically about every 30 minutes.", items };
  if (items.length) cache = { at: Date.now(), data };
  return data;
}

module.exports = { buildMarket, UNIVERSE };
