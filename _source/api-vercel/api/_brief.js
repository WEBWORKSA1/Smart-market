// Daily market brief, written automatically from the latest data. Optional: set ANTHROPIC_API_KEY to have
// Claude polish the brief; without it a deterministic, data-driven writer is used.
const pct = (n, d = 2) => (n >= 0 ? "+" : "") + n.toFixed(d) + "%";
const word = (n) => n > 1.5 ? "surged" : n > 0.6 ? "rallied" : n > 0.15 ? "edged up" : n >= 0 ? "was nearly flat, up" : n > -0.15 ? "was nearly flat, down" : n > -0.6 ? "slipped" : n > -1.5 ? "fell" : "slumped";
const mv = (n) => `${word(n)} ${Math.abs(n).toFixed(2)}%`;

function write(m, earnings) {
  const by = Object.fromEntries(m.items.map(i => [i.sym, i]));
  const stocks = m.items.filter(i => i.cls === "stock");
  const adv = stocks.filter(s => s.chgPct > 0).length;
  const sectors = {};
  stocks.forEach(s => { (sectors[s.sector] = sectors[s.sector] || []).push(s.chgPct); });
  const secAvg = Object.entries(sectors).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1]);
  const sorted = [...stocks].sort((a, b) => b.chgPct - a.chgPct);
  const up = sorted.filter(s => s.chgPct > 0).slice(0, 3), down = sorted.filter(s => s.chgPct < 0).slice(-3).reverse();
  const asOf = new Date(by.SPX ? by.SPX.asOf : m.updated);
  const dateLabel = asOf.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  const sec = [];
  const spx = by.SPX, ndx = by.NDX, dji = by.DJI;
  let headline = "Markets update";
  if (spx) headline = `S&P 500 ${mv(spx.chgPct)}${secAvg.length ? `; ${secAvg[0][0]} led, ${secAvg[secAvg.length - 1][0]} lagged` : ""}`;
  if (spx && ndx && dji) sec.push({ h: "Stocks", p: `The S&P 500 ${mv(spx.chgPct)} to ${spx.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}, the Nasdaq 100 ${mv(ndx.chgPct)} and the Dow ${mv(dji.chgPct)}. Year to date the S&P 500 is ${spx.rytd != null ? pct(spx.rytd, 1) : "n/a"}, and it sits ${((1 - spx.price / spx.hi52) * 100).toFixed(1)}% below its 52-week high.` });
  if (stocks.length) sec.push({ h: "Breadth and sectors", p: `${adv} of the ${stocks.length} large caps we track rose. By sector, ${secAvg.slice(0, 2).map(s => `${s[0]} (${pct(s[1])})`).join(" and ")} did best, while ${secAvg.slice(Math.max(2, secAvg.length - 2)).reverse().map(s => `${s[0]} (${pct(s[1])})`).join(" and ")} trailed. ${up.length ? `Biggest gainers: ${up.map(s => `${s.name} ${pct(s.chgPct)}`).join(", ")}.` : ""}${down.length ? ` Biggest decliners: ${down.map(s => `${s.name} ${pct(s.chgPct)}`).join(", ")}.` : ""}` });
  const t10 = by.US10Y, t3m = by.US3M, vix = by.VIX;
  if (t10) {
    const bp = (t10.price - t10.prev) * 100;
    sec.push({ h: "Rates and volatility", p: `The 10-year Treasury yield ${bp >= 0 ? "rose" : "fell"} ${Math.abs(bp).toFixed(0)} basis points to ${t10.price.toFixed(2)}%.${t3m ? ` The 3-month bill yields ${t3m.price.toFixed(2)}%, so the 10-year minus 3-month spread is ${((t10.price - t3m.price) * 100).toFixed(0)} bp${t10.price < t3m.price ? ", an inverted curve" : ""}.` : ""}${vix ? ` The VIX volatility index is at ${vix.price.toFixed(1)}, ${vix.price < 15 ? "a calm reading" : vix.price < 22 ? "close to its long-run norm" : vix.price < 30 ? "an elevated reading" : "a stressed reading"}.` : ""}` });
  }
  const gc = by.GC, cl = by.CL, btc = by.BTC, eur = by.EURUSD, cad = by.USDCAD;
  const parts = [];
  if (gc) parts.push(`gold ${pct(gc.chgPct)} at $${gc.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}/oz`);
  if (cl) parts.push(`WTI crude ${pct(cl.chgPct)} at $${cl.price.toFixed(2)}`);
  if (btc) parts.push(`bitcoin ${pct(btc.chgPct)} at $${btc.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
  if (parts.length) sec.push({ h: "Commodities and crypto", p: `In other markets, ${parts.join(", ")}.${eur ? ` EUR/USD trades at ${eur.price.toFixed(4)}` : ""}${cad ? ` and USD/CAD at ${cad.price.toFixed(4)}.` : eur ? "." : ""}` });
  if (earnings && earnings.length) {
    const days = [...new Set(earnings.map(e => e.date))].slice(0, 3);
    sec.push({ h: "What to watch", p: days.map(d => `${new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}: ${earnings.filter(e => e.date === d).slice(0, 5).map(e => `${e.name} (${e.sym})`).join(", ")}`).join(". ") + ". Earnings dates come from the Nasdaq calendar and can change." });
  }
  return { headline, dateLabel, sections: sec };
}

async function polish(brief) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return brief;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.BRIEF_MODEL || "claude-haiku-4-5",
        max_tokens: 900,
        messages: [{ role: "user", content: "Rewrite this market brief as clear, neutral, educational prose for retail investors. Keep every number exactly as given, invent nothing, no predictions or advice. Return JSON with the same shape {headline, sections:[{h,p}]}.\n\n" + JSON.stringify(brief) }]
      })
    });
    const j = await r.json();
    const text = j.content && j.content[0] && j.content[0].text;
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    if (parsed.headline && Array.isArray(parsed.sections)) return { ...brief, headline: parsed.headline, sections: parsed.sections, polished: true };
  } catch (e) {}
  return brief;
}

module.exports = { write, polish };
