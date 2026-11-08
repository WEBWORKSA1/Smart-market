/* ==========================================================================
   Smart.Market — front-end runtime (no framework, no build step)
   Live sources: TradingView widgets, CoinGecko (crypto), Frankfurter (FX),
   /data/*.json snapshots refreshed daily by GitHub Actions, optional API.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.SM_CONFIG || {}, D = window.SM_DATA || {};

  /* ------------------------------------------------------------ utilities */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n, d) { if (n == null || isNaN(n)) return "—"; if (d == null) d = Math.abs(n) >= 1 ? 2 : 4; return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function money(n, d) { if (n == null || isNaN(n)) return "—"; return (n < 0 ? "-$" : "$") + fmt(Math.abs(n), d == null ? 0 : d); }
  function compact(n) { if (n == null || isNaN(n)) return "—"; var a = Math.abs(n); if (a >= 1e12) return (n / 1e12).toFixed(2) + "T"; if (a >= 1e9) return (n / 1e9).toFixed(2) + "B"; if (a >= 1e6) return (n / 1e6).toFixed(2) + "M"; if (a >= 1e3) return (n / 1e3).toFixed(1) + "K"; return Number(n).toFixed(0); }
  function pct(n, d) { if (n == null || isNaN(n)) return "—"; return (n >= 0 ? "+" : "") + Number(n).toFixed(d == null ? 2 : d) + "%"; }
  function cls(n) { return n >= 0 ? "up" : "down"; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function num(v) { var x = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(x) ? 0 : x; }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  function ago(iso) {
    var t = Date.parse(iso); if (!t) return "";
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "just now"; if (m < 60) return m + " min ago";
    var h = Math.round(m / 60); if (h < 24) return h + " h ago";
    return Math.round(h / 24) + " d ago";
  }
  function when(iso) { var t = Date.parse(iso); if (!t) return ""; return new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  function toast(msg) {
    var box = $(".toasts"); if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("role", "status"); document.body.appendChild(box); }
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; box.appendChild(t);
    setTimeout(function () { t.remove(); }, 4200);
  }
  function modal(html, wide) {
    var m = document.createElement("div"); m.className = "modal";
    m.innerHTML = '<div class="modal-box' + (wide ? " wide" : "") + '" role="dialog" aria-modal="true"><button class="icon-btn modal-close" aria-label="Close">✕</button>' + html + "</div>";
    function close() { m.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    m.addEventListener("click", function (e) { if (e.target === m || e.target.closest(".modal-close")) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(m);
    m.close = close;
    return m;
  }
  function onVisible(el, fn) {
    if (!("IntersectionObserver" in window)) return fn();
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } }); }, { rootMargin: "300px" });
    io.observe(el);
  }

  var today = new Date();
  var isDark = function () { var t = document.documentElement.getAttribute("data-theme"); return t ? t === "dark" : window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches; };

  /* ------------------------------------------------------------ season */
  var SEASON = (function () {
    var y = today.getFullYear(), m = today.getMonth();
    // standings lock 4 p.m. ET (~21:00 UTC) on the last day of the month
    var end = new Date(Date.UTC(y, m + 1, 0, 21, 0, 0));
    if (Date.now() > end.getTime()) { m += 1; end = new Date(Date.UTC(y, m + 1, 0, 21, 0, 0)); }
    var start = new Date(y, m, 1);
    return { id: start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0"), label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }), end: end };
  })();

  /* ------------------------------------------------------------ data loader */
  var cache = {};
  function load(name) {
    if (cache[name]) return cache[name];
    var hour = new Date().toISOString().slice(0, 13);
    function local() {
      return fetch((C.dataPath || "/data/") + name + ".json?h=" + hour).then(function (r) { if (!r.ok) throw 0; return r.json(); });
    }
    var p = C.apiBase
      ? fetch(C.apiBase.replace(/\/$/, "") + "/api/" + name).then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(local)
      : local();
    cache[name] = p.then(function (j) {
      if (!j || (j.items && !j.items.length)) throw new Error("empty");
      return j;
    });
    cache[name].catch(function () { });
    return cache[name];
  }
  function showFor(name, ok) {
    $$('[data-needs="' + name + '"]').forEach(function (el) { el.hidden = !ok; });
    $$('[data-fallback="' + name + '"]').forEach(function (el) { el.hidden = !!ok; });
  }
  var MKT = null, BY = {};
  var mktReady = load("market").then(function (j) {
    MKT = j; (j.items || []).forEach(function (o) { BY[o.sym] = o; });
    showFor("market", true);
    $$('[data-updated-from="market"]').forEach(function (el) { var t = (j.items[0] && j.items[0].asOf) || j.updated; el.textContent = "Updated " + when(t); });
    return j;
  }, function () { showFor("market", false); return null; });

  /* ------------------------------------------------------------ TradingView */
  var TV = "https://s3.tradingview.com/external-embedding/embed-widget-";
  function tvSym(sym) {
    sym = String(sym || "").toUpperCase();
    if (D.tvIndex && D.tvIndex[sym]) return D.tvIndex[sym];
    var o = BY[sym];
    if ((D.crypto || []).some(function (c) { return c[0] === sym; }) || (o && o.cls === "crypto")) return "COINBASE:" + sym + "USD";
    if (o && o.cls === "fx") return "FX_IDC:" + sym;
    var map = { TSX: "TSX:TSX", RUT: "TVC:RUT", FTSE: "TVC:UKX", DAX: "XETR:DAX", N225: "TVC:NI225", SENSEX: "BSE:SENSEX", VIX: "TVC:VIX", SI: "TVC:SILVER", NG: "TVC:NATURALGAS", BZ: "TVC:UKOIL", HG: "COMEX:HG1!", US3M: "TVC:US03MY", US5Y: "TVC:US05Y", US30Y: "TVC:US30Y", GBPUSD: "FX_IDC:GBPUSD", USDJPY: "FX_IDC:USDJPY", USDCAD: "FX_IDC:USDCAD", USDINR: "FX_IDC:USDINR", AUDUSD: "FX_IDC:AUDUSD" };
    return map[sym] || sym;
  }
  function tvConfig(type, el) {
    var theme = isDark() ? "dark" : "light", h = el.getAttribute("data-height");
    var base = { colorTheme: theme, isTransparent: true, locale: "en", width: "100%", height: "100%" };
    function m(o) { for (var k in o) base[k] = o[k]; return base; }
    switch (type) {
      case "ticker-tape": return { src: "ticker-tape", cfg: { symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" }, { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" }, { proName: "FOREXCOM:DJI", title: "Dow" },
        { proName: "TSX:TSX", title: "TSX" }, { proName: "TVC:US10Y", title: "US 10Y" }, { proName: "TVC:GOLD", title: "Gold" }, { proName: "TVC:USOIL", title: "WTI" },
        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" }, { proName: "BITSTAMP:ETHUSD", title: "Ethereum" }, { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
        { proName: "FX_IDC:USDCAD", title: "USD/CAD" }, { proName: "NASDAQ:AAPL", title: "Apple" }, { proName: "NASDAQ:NVDA", title: "NVIDIA" }, { proName: "NASDAQ:MSFT", title: "Microsoft" }],
        showSymbolLogo: true, isTransparent: true, displayMode: "adaptive", colorTheme: theme, locale: "en" } };
      case "market-overview": return { src: "market-overview", cfg: m({ dateRange: "1D", showChart: true, showSymbolLogo: true, showFloatingTooltip: true,
        plotLineColorGrowing: "rgba(29,69,224,1)", plotLineColorFalling: "rgba(210,50,45,1)", belowLineFillColorGrowing: "rgba(29,69,224,.12)", belowLineFillColorFalling: "rgba(210,50,45,.12)",
        tabs: [
          { title: "Indices", symbols: [{ s: "FOREXCOM:SPXUSD", d: "S&P 500" }, { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" }, { s: "FOREXCOM:DJI", d: "Dow 30" }, { s: "TSX:TSX", d: "S&P/TSX" }, { s: "INDEX:NKY", d: "Nikkei 225" }, { s: "INDEX:DEU40", d: "DAX" }, { s: "FOREXCOM:UKXGBP", d: "FTSE 100" }] },
          { title: "Futures", symbols: [{ s: "CME_MINI:ES1!", d: "S&P 500 futures" }, { s: "CME_MINI:NQ1!", d: "Nasdaq futures" }, { s: "COMEX:GC1!", d: "Gold" }, { s: "NYMEX:CL1!", d: "WTI crude" }, { s: "NYMEX:NG1!", d: "Natural gas" }] },
          { title: "Bonds", symbols: [{ s: "TVC:US02Y", d: "US 2Y" }, { s: "TVC:US10Y", d: "US 10Y" }, { s: "TVC:US30Y", d: "US 30Y" }, { s: "TVC:CA10Y", d: "Canada 10Y" }, { s: "TVC:DE10Y", d: "Germany 10Y" }] },
          { title: "Forex", symbols: [{ s: "FX_IDC:EURUSD", d: "EUR/USD" }, { s: "FX_IDC:USDCAD", d: "USD/CAD" }, { s: "FX_IDC:GBPUSD", d: "GBP/USD" }, { s: "FX_IDC:USDJPY", d: "USD/JPY" }, { s: "FX_IDC:USDINR", d: "USD/INR" }] },
          { title: "Crypto", symbols: [{ s: "BITSTAMP:BTCUSD", d: "Bitcoin" }, { s: "BITSTAMP:ETHUSD", d: "Ethereum" }, { s: "COINBASE:SOLUSD", d: "Solana" }, { s: "BITSTAMP:XRPUSD", d: "XRP" }] }
        ] }) };
      case "stock-heatmap": return { src: "stock-heatmap", cfg: m({ exchanges: [], dataSource: "SPX500", grouping: "sector", blockSize: "market_cap_basic", blockColor: "change", hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true, hasSymbolTooltip: true, isMonoSize: false }) };
      case "crypto-coins-heatmap": return { src: "crypto-coins-heatmap", cfg: m({ dataSource: "Crypto", blockSize: "market_cap_calc", blockColor: "change", hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true, hasSymbolTooltip: true, isMonoSize: false }) };
      case "screener": return { src: "screener", cfg: m({ defaultColumn: "overview", defaultScreen: "most_capitalized", market: "america", showToolbar: true }) };
      case "events": return { src: "events", cfg: m({ importanceFilter: "0,1", countryFilter: "us,ca,eu,gb,jp,cn,in,au" }) };
      case "timeline": return { src: "timeline", cfg: m({ feedMode: "all_symbols", displayMode: "regular" }) };
      case "hotlists": return { src: "hotlists", cfg: m({ exchange: "US", showChart: true, showSymbolLogo: true, dateRange: "1D", plotLineColorGrowing: "rgba(29,69,224,1)", plotLineColorFalling: "rgba(210,50,45,1)" }) };
      case "forex-cross-rates": return { src: "forex-cross-rates", cfg: m({ currencies: ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "INR"] }) };
      case "symbol-overview": return { src: "symbol-overview", cfg: m({ symbols: [[el.getAttribute("data-symbol")]], chartOnly: false, showVolume: false, hideDateRanges: false, scalePosition: "right", chartType: "area", lineColor: "rgba(29,69,224,1)", topColor: "rgba(29,69,224,.25)", bottomColor: "rgba(29,69,224,0)", dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"] }) };
      case "technical-analysis": return { src: "technical-analysis", cfg: m({ symbol: el.getAttribute("data-symbol"), interval: "1D", showIntervalTabs: true, displayMode: "single" }) };
      case "symbol-profile": return { src: "symbol-profile", cfg: m({ symbol: el.getAttribute("data-symbol") }) };
    }
    return null;
  }
  function mountTV(el) {
    var type = el.getAttribute("data-tv"), conf = tvConfig(type, el);
    if (!conf) return;
    el.setAttribute("data-mounted", "1");
    var h = el.getAttribute("data-height");
    if (h && !el.style.height && !el.classList.contains("tall")) el.style.height = h + "px";
    el.innerHTML = '<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Market data by TradingView</a></div></div>';
    var s = document.createElement("script");
    s.src = TV + conf.src + ".js"; s.async = true; s.type = "text/javascript";
    s.innerHTML = JSON.stringify(conf.cfg);
    el.firstChild.appendChild(s);
  }
  function initTV(root) {
    $$("[data-tv]", root).forEach(function (el) {
      if (el.getAttribute("data-mounted")) return;
      onVisible(el, function () { mountTV(el); });
    });
  }
  function remountTV() { $$('[data-tv][data-mounted]').forEach(mountTV); }

  /* ------------------------------------------------------------ charts */
  function fitCanvas(cv, hgt) {
    var r = window.devicePixelRatio || 1, w = cv.clientWidth || cv.parentNode.clientWidth || 300, h = hgt || cv.clientHeight || 40;
    cv.width = w * r; cv.height = h * r; var x = cv.getContext("2d"); x.setTransform(r, 0, 0, r, 0, 0); return { x: x, w: w, h: h };
  }
  function spark(cv, data, up) {
    if (!cv || !data || data.length < 2) return;
    var f = fitCanvas(cv), x = f.x, mn = Math.min.apply(null, data), mx = Math.max.apply(null, data), rg = mx - mn || 1;
    var col = up ? css("--up") : css("--down");
    x.beginPath();
    data.forEach(function (v, i) { var px = i / (data.length - 1) * f.w, py = f.h - 2 - (v - mn) / rg * (f.h - 4); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.strokeStyle = col; x.lineWidth = 1.6; x.stroke();
    x.lineTo(f.w, f.h); x.lineTo(0, f.h); x.closePath(); x.globalAlpha = .12; x.fillStyle = col; x.fill(); x.globalAlpha = 1;
  }
  function chart(cv, series, opts) {
    opts = opts || {};
    var f = fitCanvas(cv, 280), x = f.x, padL = 64, padB = 26, padT = 10, padR = 10, W = f.w - padL - padR, H = f.h - padT - padB;
    var n = series[0].data.length; if (n < 2) return;
    var mx = 0; series.forEach(function (s) { s.data.forEach(function (v, i) { var t = opts.stacked ? series.reduce(function (a, ss) { return a + (ss.data[i] || 0); }, 0) : v; if (t > mx) mx = t; }); });
    mx = mx * 1.08 || 1;
    x.font = "11px " + css("--f-mono"); x.fillStyle = css("--ink-3"); x.strokeStyle = css("--line"); x.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var gy = padT + H - g / 4 * H; x.beginPath(); x.moveTo(padL, gy); x.lineTo(padL + W, gy); x.stroke();
      x.textAlign = "right"; x.fillText("$" + compact(mx * g / 4), padL - 8, gy + 4);
    }
    x.textAlign = "center";
    var step = Math.max(1, Math.ceil(n / 8));
    for (var i = 0; i < n; i += step) x.fillText((opts.xLabel ? opts.xLabel(i) : i), padL + i / (n - 1) * W, f.h - 8);
    var base = new Array(n).fill(0);
    series.forEach(function (s) {
      var col = css(s.color) || s.color, pts = s.data.map(function (v, i) { var y = opts.stacked ? base[i] + v : v; return [padL + i / (n - 1) * W, padT + H - y / mx * H]; });
      x.beginPath(); pts.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); });
      x.strokeStyle = col; x.lineWidth = 2; x.stroke();
      if (s.fill !== false) {
        for (var j = n - 1; j >= 0; j--) x.lineTo(padL + j / (n - 1) * W, padT + H - (opts.stacked ? base[j] : 0) / mx * H);
        x.closePath(); x.globalAlpha = s.alpha || .18; x.fillStyle = col; x.fill(); x.globalAlpha = 1;
      }
      if (opts.stacked) s.data.forEach(function (v, i) { base[i] += v; });
    });
  }

  /* ------------------------------------------------------------ market widgets */
  function priceStr(o) { if (!o || o.price == null) return "—"; if (o.cls === "bond") return o.price.toFixed(3) + "%"; if (o.cls === "fx") return o.price.toFixed(o.price > 20 ? 2 : 4); return fmt(o.price, o.price < 2 ? 4 : 2); }
  function symCell(o) { return '<span class="sym">' + esc(o.sym) + '</span><span class="sym-name">' + esc(o.name || "") + "</span>"; }
  function rowClick(root) {
    $$("tr[data-sym]", root).forEach(function (tr) { tr.classList.add("click"); tr.addEventListener("click", function () { openSymbol(tr.getAttribute("data-sym")); }); });
  }
  function renderIndices(el) {
    var syms = (el.getAttribute("data-syms") || "").split(",");
    el.innerHTML = syms.map(function (s) {
      var o = BY[s]; if (!o) return "";
      return '<button type="button" class="idx" data-sym="' + esc(s) + '" style="text-align:left;cursor:pointer;font:inherit;color:inherit"><span class="n">' + esc(o.name) + '</span><span class="p">' + priceStr(o) + '</span><span><span class="chip ' + cls(o.chgPct) + '">' + pct(o.chgPct) + '</span></span><canvas></canvas></button>';
    }).join("");
    $$(".idx", el).forEach(function (b) { var o = BY[b.getAttribute("data-sym")]; spark($("canvas", b), o.hist, o.chgPct >= 0); b.addEventListener("click", function () { openSymbol(o.sym); }); });
  }
  function renderMovers(el) {
    var lim = +el.getAttribute("data-limit") || 7, mode = el._mode || "gain";
    var st = MKT.items.filter(function (o) { return o.cls === "stock"; });
    var sorted = st.slice().sort(function (a, b) {
      if (mode === "gain") return b.chgPct - a.chgPct; if (mode === "lose") return a.chgPct - b.chgPct;
      if (mode === "active") return (b.vol || 0) * b.price - (a.vol || 0) * a.price; return (b.rytd || 0) - (a.rytd || 0);
    }).slice(0, lim);
    var tabs = [["gain", "Gainers"], ["lose", "Losers"], ["active", "Most active"], ["ytd", "YTD leaders"]];
    el.innerHTML = '<div class="seg" role="group" style="margin:8px 0">' + tabs.map(function (t) { return '<button type="button" data-m="' + t[0] + '" aria-pressed="' + (t[0] === mode) + '">' + t[1] + "</button>"; }).join("") + '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>Symbol</th><th class="r">Price</th><th class="r">Day</th><th class="r">' + (mode === "ytd" ? "YTD" : "$ volume") + '</th></tr></thead><tbody>' +
      sorted.map(function (o) { return '<tr data-sym="' + esc(o.sym) + '"><td>' + symCell(o) + '</td><td class="r num">' + priceStr(o) + '</td><td class="r num ' + cls(o.chgPct) + '">' + pct(o.chgPct) + '</td><td class="r num">' + (mode === "ytd" ? '<span class="' + cls(o.rytd || 0) + '">' + pct(o.rytd) + "</span>" : "$" + compact((o.vol || 0) * o.price)) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    $$("[data-m]", el).forEach(function (b) { b.addEventListener("click", function () { el._mode = b.getAttribute("data-m"); renderMovers(el); }); });
    rowClick(el);
  }
  function renderSectors(el) {
    var by = {};
    MKT.items.forEach(function (o) { if (o.cls === "stock" && o.sector) { (by[o.sector] = by[o.sector] || []).push(o.chgPct); } });
    var rows = Object.keys(by).map(function (k) { var a = by[k]; return [k, a.reduce(function (s, v) { return s + v; }, 0) / a.length]; }).sort(function (a, b) { return b[1] - a[1]; });
    var mx = Math.max.apply(null, rows.map(function (r) { return Math.abs(r[1]); }).concat([0.5]));
    el.innerHTML = rows.map(function (r) {
      var w = Math.abs(r[1]) / mx * 50, left = r[1] >= 0 ? 50 : 50 - w;
      return '<div class="sec-row"><span>' + esc(r[0]) + '</span><div class="sec-bar"><i style="left:' + left + "%;width:" + w + "%;background:var(" + (r[1] >= 0 ? "--up" : "--down") + ')"></i></div><b class="' + cls(r[1]) + '">' + pct(r[1]) + "</b></div>";
    }).join("");
  }
  function renderAssets(el) {
    var tab = el._tab || "all", names = [["all", "All"], ["index", "Indices"], ["stock", "Stocks"], ["bond", "Rates"], ["commodity", "Commodities"], ["fx", "Currencies"], ["crypto", "Crypto"]];
    var list = MKT.items.filter(function (o) { return tab === "all" || o.cls === tab; });
    el.innerHTML = '<div class="tabs" role="tablist">' + names.map(function (t) { return '<button class="tab" role="tab" data-t="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") + '</div>' +
      '<div class="table-wrap" style="max-height:620px"><table><thead><tr><th>Symbol</th><th class="r">Last</th><th class="r">Day</th><th class="r">1M</th><th class="r">YTD</th><th>52-week range</th><th>60-day</th></tr></thead><tbody>' +
      list.map(function (o) {
        var pos = o.hi52 > o.lo52 ? (o.price - o.lo52) / (o.hi52 - o.lo52) * 100 : 50;
        return '<tr data-sym="' + esc(o.sym) + '"><td>' + symCell(o) + '</td><td class="r num">' + priceStr(o) + '</td><td class="r num ' + cls(o.chgPct) + '">' + pct(o.chgPct) + '</td><td class="r num ' + cls(o.r1m || 0) + '">' + pct(o.r1m, 1) + '</td><td class="r num ' + cls(o.rytd || 0) + '">' + pct(o.rytd, 1) + '</td><td><div class="rangebar" title="' + fmt(o.lo52) + " – " + fmt(o.hi52) + '"><i style="left:calc(' + clamp(pos, 0, 100) + '% - 2px)"></i></div></td><td><canvas class="mini"></canvas></td></tr>';
      }).join("") + "</tbody></table></div>";
    $$("tr[data-sym]", el).forEach(function (tr) { var o = BY[tr.getAttribute("data-sym")]; spark($("canvas", tr), o.hist, (o.r1m || o.chgPct) >= 0); });
    $$("[data-t]", el).forEach(function (b) { b.addEventListener("click", function () { el._tab = b.getAttribute("data-t"); renderAssets(el); }); });
    rowClick(el);
  }

  /* ------------------------------------------------------------ smart score + screener */
  function smartScore(o) {
    var val = o.pe > 0 ? clamp((45 - o.pe) / 35, 0, 1) : 0.35;
    var size = o.mcap ? clamp((Math.log10(o.mcap) - 1) / 2.6, 0, 1) : 0.5;
    var stab = o.beta != null ? clamp((2 - o.beta) / 1.6, 0, 1) : 0.5;
    var inc = o.div ? clamp(o.div / 4, 0, 1) : 0;
    var mom = o.r1m != null ? clamp((o.r1m + 10) / 20, 0, 1) : 0.5;
    return Math.round(100 * (val * .28 + size * .20 + stab * .20 + inc * .17 + mom * .15));
  }
  function scoreChip(s) { var c = s >= 65 ? "--up" : s >= 45 ? "--amber" : "--down"; return '<span class="score" style="background:color-mix(in srgb,var(' + c + ') 18%,transparent);color:var(' + (s >= 45 && s < 65 ? "--ink" : c) + ')">' + s + "</span>"; }
  function renderScreener(el) {
    var st = MKT.items.filter(function (o) { return o.cls === "stock"; });
    st.forEach(function (o) { o.score = smartScore(o); });
    var sectors = Array.from(new Set(st.map(function (o) { return o.sector; }).filter(Boolean))).sort();
    var presets = [["all", "All large caps"], ["value", "Value"], ["income", "Dividend income"], ["lowvol", "Low volatility"], ["momentum", "Momentum"], ["top", "Top Smart Score"]];
    var S = { preset: "all", sector: "", pe: "", yld: "", beta: "", sort: "score", dir: -1 };
    el.innerHTML = '<div class="panel lift"><div class="seg" role="group" aria-label="Presets">' + presets.map(function (p) { return '<button type="button" data-p="' + p[0] + '" aria-pressed="' + (p[0] === "all") + '">' + p[1] + "</button>"; }).join("") + '</div>' +
      '<div class="filters"><div class="field"><label for="sc-sec">Sector</label><select id="sc-sec"><option value="">All sectors</option>' + sectors.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("") + '</select></div>' +
      '<div class="field"><label for="sc-pe">Max P/E</label><input id="sc-pe" type="number" min="0" placeholder="Any" /></div>' +
      '<div class="field"><label for="sc-y">Min dividend yield %</label><input id="sc-y" type="number" min="0" step="0.1" placeholder="Any" /></div>' +
      '<div class="field"><label for="sc-b">Max beta</label><input id="sc-b" type="number" min="0" step="0.1" placeholder="Any" /></div></div>' +
      '<div class="row between"><b class="res-count">0 matches</b><span class="xs muted">' + esc(MKT.items[0] && MKT.items[0].asOf ? "Data as of " + when(MKT.items[0].asOf) : "") + ' · tap a row for a live chart</span></div>' +
      '<div class="table-wrap" style="margin-top:10px"><table><thead><tr>' +
      [["sym", "Company"], ["sector", "Sector"], ["price", "Price", 1], ["chgPct", "Day", 1], ["mcap", "Mkt cap", 1], ["pe", "P/E", 1], ["div", "Yield", 1], ["beta", "Beta", 1], ["r1m", "1M", 1], ["score", "Smart Score", 1]].map(function (c) { return '<th class="sortable' + (c[2] ? " r" : "") + '" data-k="' + c[0] + '">' + c[1] + "</th>"; }).join("") +
      '</tr></thead><tbody></tbody></table></div><p class="xs muted" style="margin-top:10px">Screen results are for research and education, not recommendations. Fundamentals are refreshed with each daily data update and may be missing for some companies.</p></div>';
    function run() {
      var list = st.filter(function (o) {
        if (S.sector && o.sector !== S.sector) return false;
        if (S.pe && !(o.pe > 0 && o.pe <= +S.pe)) return false;
        if (S.yld && !((o.div || 0) >= +S.yld)) return false;
        if (S.beta && !(o.beta != null && o.beta <= +S.beta)) return false;
        if (S.preset === "value") return o.pe > 0 && o.pe < 20;
        if (S.preset === "income") return (o.div || 0) >= 2;
        if (S.preset === "lowvol") return o.beta != null && o.beta < 0.9;
        if (S.preset === "momentum") return (o.r1m || 0) > 3;
        if (S.preset === "top") return o.score >= 60;
        return true;
      });
      list.sort(function (a, b) { var x = a[S.sort], y = b[S.sort]; if (typeof x === "string" || typeof y === "string") return String(x || "").localeCompare(String(y || "")) * S.dir; return ((x == null ? -1e9 : x) - (y == null ? -1e9 : y)) * S.dir; });
      $(".res-count", el).textContent = list.length + (list.length === 1 ? " match" : " matches");
      $("tbody", el).innerHTML = list.map(function (o) {
        return '<tr data-sym="' + esc(o.sym) + '"><td>' + symCell(o) + "</td><td>" + esc(o.sector || "") + '</td><td class="r num">' + priceStr(o) + '</td><td class="r num ' + cls(o.chgPct) + '">' + pct(o.chgPct) + '</td><td class="r num">' + (o.mcap ? "$" + compact(o.mcap * 1e9) : "—") + '</td><td class="r num">' + (o.pe ? o.pe.toFixed(1) : "—") + '</td><td class="r num">' + (o.div != null ? o.div.toFixed(2) + "%" : "—") + '</td><td class="r num">' + (o.beta != null ? o.beta.toFixed(2) : "—") + '</td><td class="r num ' + cls(o.r1m || 0) + '">' + pct(o.r1m, 1) + '</td><td class="r">' + scoreChip(o.score) + "</td></tr>";
      }).join("") || '<tr><td colspan="10" class="empty">No stocks match. Loosen a filter.</td></tr>';
      rowClick(el);
    }
    $$("[data-p]", el).forEach(function (b) { b.addEventListener("click", function () { S.preset = b.getAttribute("data-p"); $$("[data-p]", el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); run(); }); });
    $("#sc-sec", el).addEventListener("change", function (e) { S.sector = e.target.value; run(); });
    [["#sc-pe", "pe"], ["#sc-y", "yld"], ["#sc-b", "beta"]].forEach(function (p) { $(p[0], el).addEventListener("input", function (e) { S[p[1]] = e.target.value; run(); }); });
    $$("th[data-k]", el).forEach(function (th) { th.addEventListener("click", function () { var k = th.getAttribute("data-k"); if (S.sort === k) S.dir *= -1; else { S.sort = k; S.dir = k === "sym" || k === "sector" ? 1 : -1; } run(); }); });
    run();
  }

  /* ------------------------------------------------------------ crypto (CoinGecko) */
  var cgP = null;
  function loadCrypto(force) {
    if (cgP && !force) return cgP;
    var ids = (D.crypto || []).map(function (c) { return c[2]; }).join(",");
    cgP = fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" + ids + "&order=market_cap_desc&sparkline=true&price_change_percentage=24h,7d")
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (list) {
        if (!list || !list.length) throw 0;
        return list.map(function (c) {
          return { sym: c.symbol.toUpperCase(), name: c.name, price: c.current_price, chgPct: c.price_change_percentage_24h_in_currency || 0, r7d: c.price_change_percentage_7d_in_currency || 0, mcap: c.market_cap, hist: (c.sparkline_in_7d && c.sparkline_in_7d.price) || [], asOf: c.last_updated, cls: "crypto", live: true };
        });
      })
      .catch(function () {
        return mktReady.then(function () {
          var l = MKT ? MKT.items.filter(function (o) { return o.cls === "crypto"; }) : [];
          if (!l.length) throw new Error("no crypto");
          return l.map(function (o) { return { sym: o.sym, name: o.name, price: o.price, chgPct: o.chgPct, r7d: null, mcap: null, hist: o.hist, asOf: o.asOf, cls: "crypto" }; });
        });
      });
    cgP.catch(function () { });
    return cgP;
  }
  function renderCrypto(el) {
    var lim = +el.getAttribute("data-limit") || 12;
    loadCrypto().then(function (list) {
      list = list.slice(0, lim);
      el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Asset</th><th class="r">Price (USD)</th><th class="r">24h</th><th class="r">7d</th><th class="r">Mkt cap</th><th>7-day trend</th></tr></thead><tbody>' +
        list.map(function (c) { return '<tr data-sym="' + esc(c.sym) + '"><td>' + symCell(c) + '</td><td class="r num">' + fmt(c.price, c.price < 2 ? 4 : 2) + '</td><td class="r num ' + cls(c.chgPct) + '">' + pct(c.chgPct) + '</td><td class="r num ' + cls(c.r7d || 0) + '">' + pct(c.r7d) + '</td><td class="r num">' + (c.mcap ? "$" + compact(c.mcap) : "—") + '</td><td><canvas class="mini"></canvas></td></tr>'; }).join("") +
        '</tbody></table></div><p class="xs muted" style="margin-top:8px">' + (list[0] && list[0].live ? 'Live prices from <a href="https://www.coingecko.com/" rel="noopener nofollow" target="_blank">CoinGecko</a> · refreshes every 2 minutes · updated ' + ago(list[0].asOf) : "Daily snapshot prices · live feed unavailable") + "</p>";
      $$("tr[data-sym]", el).forEach(function (tr, i) { spark($("canvas", tr), list[i].hist, (list[i].r7d != null ? list[i].r7d : list[i].chgPct) >= 0); });
      rowClick(el);
    }, function () { el.innerHTML = '<p class="empty">Crypto prices are temporarily unavailable. <a href="/markets.html#crypto">See the live crypto heatmap</a>.</p>'; });
  }

  /* ------------------------------------------------------------ brief / news / earnings / videos */
  function briefHTML(b) {
    var asof = b.marketAsOf || b.updated || "";
    return '<div class="brief-doc prose" style="max-width:none"><p class="eyebrow">Market brief · ' + esc(b.dateLabel || "") + '</p><h1 style="margin-top:10px;font-size:clamp(1.6rem,3vw,2.3rem)">' + esc(b.headline || "Market brief") + '</h1><p class="xs muted" style="margin-top:8px">Written automatically from market data' + (b.polished ? " and edited by AI" : "") + " · data as of " + esc(when(asof)) + " · prices may be delayed.</p>" +
      (b.sections || []).map(function (s) { return "<section><h2>" + esc(s.h) + "</h2><p>" + esc(s.p) + "</p></section>"; }).join("") +
      '<p class="xs muted">This brief is generated from public market data for education. It is not investment advice or a recommendation to buy or sell any security.</p></div>';
  }
  function initBrief() {
    var els = $$('[data-widget="brief"]');
    load("brief").then(function (b) {
      showFor("brief", true);
      els.forEach(function (el) {
        if (el.getAttribute("data-mode") === "teaser") {
          var s = (b.sections || [])[0] || {};
          el.innerHTML = '<div class="brief-teaser"><div class="row between"><span class="eyebrow">Today\'s market brief · ' + esc(b.dateLabel || "") + '</span><span class="xs muted">Updated ' + esc(ago(b.updated)) + '</span></div><h2>' + esc(b.headline) + "</h2><p>" + esc(s.p || "") + '</p><a class="btn primary sm" style="margin-top:14px" href="/brief.html">Read the full brief →</a></div>';
        } else el.innerHTML = briefHTML(b);
      });
    }, function () { showFor("brief", false); });
  }
  function initNews() {
    var els = $$('[data-widget="news"]'); if (!els.length) return;
    load("news").then(function (j) {
      showFor("news", true);
      els.forEach(function (el) {
        var lim = +el.getAttribute("data-limit") || 40, topics = Array.from(new Set(j.items.map(function (x) { return x.topic; }).filter(Boolean)));
        var full = lim > 10, topic = "";
        function draw() {
          var list = j.items.filter(function (x) { return !topic || x.topic === topic; }).slice(0, lim);
          $(".news-list", el).innerHTML = list.map(function (x) { return '<li><a href="' + esc(x.link) + '" target="_blank" rel="noopener nofollow">' + esc(x.title) + '</a><div class="meta">' + esc(x.source) + (x.date ? " · " + esc(ago(x.date)) : "") + (x.topic && full ? " · " + esc(x.topic) : "") + "</div></li>"; }).join("");
        }
        el.innerHTML = (full ? '<div class="seg" role="group" style="margin-bottom:10px"><button type="button" data-tp="" aria-pressed="true">All</button>' + topics.map(function (t) { return '<button type="button" data-tp="' + esc(t) + '" aria-pressed="false">' + esc(t) + "</button>"; }).join("") + "</div>" : "") + '<ul class="news-list"></ul>' + (full ? '<p class="xs muted" style="margin-top:10px">Headlines link to the original publishers. Refreshed automatically; updated ' + esc(ago(j.updated)) + ".</p>" : "");
        $$("[data-tp]", el).forEach(function (b) { b.addEventListener("click", function () { topic = b.getAttribute("data-tp"); $$("[data-tp]", el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); draw(); }); });
        draw();
      });
    }, function () { showFor("news", false); });
  }
  function initEarnings() {
    var els = $$('[data-widget="earnings"]'); if (!els.length) return;
    load("earnings").then(function (j) {
      showFor("earnings", true);
      els.forEach(function (el) {
        var lim = +el.getAttribute("data-limit") || 40;
        el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Company</th><th>Time</th><th class="r">EPS estimate</th></tr></thead><tbody>' +
          j.items.slice(0, lim).map(function (e) { return '<tr data-sym="' + esc(e.sym) + '"><td class="num">' + esc(new Date(e.date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })) + "</td><td>" + symCell({ sym: e.sym, name: e.name }) + "</td><td>" + esc(e.time) + '</td><td class="r num">' + esc(e.eps || "—") + "</td></tr>"; }).join("") +
          '</tbody></table></div><p class="xs muted" style="margin-top:8px">Source: ' + esc(j.source || "public earnings calendars") + ". Dates can change; confirm with the company.</p>";
        rowClick(el);
      });
    }, function () { showFor("earnings", false); });
  }
  function ytModal(id, title) {
    modal('<iframe class="video-frame" src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0" title="' + esc(title || "Video") + '" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>', true);
  }
  function initVideos() {
    var el = $('[data-widget="videos"]'); if (!el) return;
    var chans = ((C.youtube && C.youtube.channels) || []).slice();
    if (C.youtube && C.youtube.ownChannel) chans.unshift({ id: C.youtube.ownChannel, name: "Smart.Market", topic: "Our channel" });
    function playlists() {
      el.innerHTML = '<div class="yt-grid">' + chans.map(function (c) {
        return '<div class="panel" style="padding:14px"><div class="row between" style="margin-bottom:10px"><b>' + esc(c.name) + '</b><span class="chip">' + esc(c.topic || "") + '</span></div><div class="yt-slot" data-list="UU' + esc(c.id.slice(2)) + '"><button type="button" class="vid" style="width:100%"><span class="thumb" style="background:linear-gradient(135deg,#1D45E0,#0D1526)"><span>Latest uploads · ' + esc(c.name) + '</span></span></button></div><a class="xs" style="display:inline-block;margin-top:8px" href="https://www.youtube.com/channel/' + esc(c.id) + '" target="_blank" rel="noopener">Open channel on YouTube →</a></div>';
      }).join("") + '</div><p class="xs muted" style="margin-top:12px">Each player shows that channel\'s newest uploads automatically. Videos are embedded from YouTube in privacy-enhanced mode; we don\'t control their content.</p>';
      $$(".yt-slot", el).forEach(function (s) {
        $("button", s).addEventListener("click", function () { s.innerHTML = '<iframe class="yt-embed" src="https://www.youtube-nocookie.com/embed/videoseries?list=' + s.getAttribute("data-list") + '&rel=0" title="Latest uploads" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>'; });
      });
    }
    load("videos").then(function (j) {
      var chs = Array.from(new Set(j.items.map(function (v) { return v.channel; }))), ch = "";
      function draw() {
        var list = j.items.filter(function (v) { return !ch || v.channel === ch; });
        $(".yt-grid", el).innerHTML = list.map(function (v) {
          return '<button type="button" class="vid" data-id="' + esc(v.id) + '" data-t="' + esc(v.title) + '"><span class="thumb" style="background-image:url(https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg)"></span><h4>' + esc(v.title) + "</h4><small>" + esc(v.channel) + " · " + esc(ago(v.published)) + "</small></button>";
        }).join("");
        $$(".vid", el).forEach(function (b) { b.addEventListener("click", function () { ytModal(b.getAttribute("data-id"), b.getAttribute("data-t")); }); });
      }
      el.innerHTML = '<div class="seg" role="group" style="margin-bottom:16px"><button type="button" data-c="" aria-pressed="true">All channels</button>' + chs.map(function (c) { return '<button type="button" data-c="' + esc(c) + '" aria-pressed="false">' + esc(c) + "</button>"; }).join("") + '</div><div class="yt-grid"></div><p class="xs muted" style="margin-top:12px">Newest uploads from public finance channels, refreshed automatically (updated ' + esc(ago(j.updated)) + "). Videos are embedded from YouTube in privacy-enhanced mode.</p>";
      $$("[data-c]", el).forEach(function (b) { b.addEventListener("click", function () { ch = b.getAttribute("data-c"); $$("[data-c]", el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); draw(); }); });
      draw();
    }, playlists);
  }

  /* ------------------------------------------------------------ FX converter */
  function initFx() {
    var el = $('[data-widget="fx"]'); if (!el) return;
    var CUR = ["USD", "CAD", "EUR", "GBP", "INR", "JPY", "AUD", "CHF", "CNY", "MXN", "SGD", "HKD", "NZD", "SEK", "KRW", "BRL", "ZAR", "AED"];
    el.innerHTML = '<div class="fx-form"><div class="field fx-amt"><label for="fx-a">Amount</label><input id="fx-a" type="number" min="0" step="any" value="1000" /></div><div class="field"><label for="fx-f">From</label><select id="fx-f"></select></div><button type="button" class="icon-btn fx-swap" aria-label="Swap currencies" style="margin-bottom:4px">⇄</button><div class="field"><label for="fx-t">To</label><select id="fx-t"></select></div></div><div class="fx-out">Loading rates…</div><p class="xs muted fx-src" style="margin-top:6px"></p><div class="fx-grid"></div>';
    var f = $("#fx-f", el), t = $("#fx-t", el), a = $("#fx-a", el), R = null;
    function fill(sel, v) { sel.innerHTML = CUR.map(function (c) { return "<option" + (c === v ? " selected" : "") + ">" + c + "</option>"; }).join(""); }
    fill(f, "USD"); fill(t, "CAD");
    function calc() {
      if (!R) return;
      var rf = R.rates[f.value], rt = R.rates[t.value];
      if (!rf || !rt) { $(".fx-out", el).textContent = "Rate unavailable for this pair"; return; }
      var v = num(a.value) / rf * rt;
      $(".fx-out", el).textContent = fmt(num(a.value), 2) + " " + f.value + " = " + fmt(v, 2) + " " + t.value;
      $(".fx-grid", el).innerHTML = ["USD", "CAD", "EUR", "GBP", "INR", "JPY", "AUD", "CHF"].filter(function (c) { return c !== f.value && R.rates[c]; }).slice(0, 8).map(function (c) { return "<div>1 " + f.value + " in " + c + "<b>" + fmt(R.rates[c] / rf, R.rates[c] / rf > 20 ? 2 : 4) + "</b></div>"; }).join("");
    }
    [a, f, t].forEach(function (x) { x.addEventListener("input", calc); x.addEventListener("change", calc); });
    $(".fx-swap", el).addEventListener("click", function () { var v = f.value; f.value = t.value; t.value = v; calc(); });
    fetch("https://api.frankfurter.dev/v1/latest?base=USD").then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { j.rates = j.rates || {}; j.rates.USD = 1; return { rates: j.rates, date: j.date, source: "European Central Bank reference rates via Frankfurter" }; })
      .catch(function () { return load("fx"); })
      .then(function (j) { R = j; $(".fx-src", el).textContent = "Source: " + (j.source || "ECB reference rates") + (j.date ? " · as of " + j.date : "") + ". Indicative mid-market rates; your bank's rate will differ."; calc(); },
        function () { $(".fx-out", el).textContent = "Live rates are unavailable right now."; });
  }

  /* ------------------------------------------------------------ watchlist + symbol drawer + search */
  function watch() { return store.get("sm_watch", ["SPX", "AAPL", "NVDA", "BTC"]); }
  function setWatch(l) { store.set("sm_watch", l); renderWatchAll(); }
  function renderWatchAll() { $$('[data-widget="watchlist"]').forEach(renderWatch); }
  function renderWatch(el) {
    var l = watch();
    if (!l.length) { el.innerHTML = '<p class="empty">Your watchlist is empty. Use search to add symbols.</p>'; return; }
    el.innerHTML = '<div class="table-wrap"><table><tbody>' + l.map(function (s) {
      var o = BY[s];
      return '<tr data-sym="' + esc(s) + '"><td>' + symCell(o || { sym: s, name: "Open live chart" }) + '</td><td class="r num">' + (o ? priceStr(o) : "") + '</td><td class="r num">' + (o ? '<span class="chip ' + cls(o.chgPct) + '">' + pct(o.chgPct) + "</span>" : '<span class="xs muted">chart →</span>') + '</td><td class="r"><button class="icon-btn" data-rm="' + esc(s) + '" aria-label="Remove ' + esc(s) + '" style="width:30px;height:30px">✕</button></td></tr>';
    }).join("") + "</tbody></table></div>";
    $$("[data-rm]", el).forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); setWatch(watch().filter(function (x) { return x !== b.getAttribute("data-rm"); })); }); });
    rowClick(el);
  }
  function openSymbol(sym) {
    sym = String(sym || "").trim().toUpperCase().replace(/^\$/, ""); if (!sym) return;
    var old = $(".drawer"); if (old) { old.remove(); $(".scrim") && $(".scrim").remove(); }
    var o = BY[sym], tvs = tvSym(sym), isStock = !o || o.cls === "stock";
    var scrim = document.createElement("div"); scrim.className = "scrim";
    var d = document.createElement("aside"); d.className = "drawer"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", sym + " details");
    var inW = watch().indexOf(sym) >= 0;
    var stats = o ? '<div class="calc-out" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:14px">' +
      '<div class="stat"><span>Last close</span><b>' + priceStr(o) + '</b></div><div class="stat"><span>Day</span><b class="' + cls(o.chgPct) + '">' + pct(o.chgPct) + "</b></div>" +
      '<div class="stat"><span>52-week range</span><b style="font-size:.95rem">' + fmt(o.lo52) + " – " + fmt(o.hi52) + '</b></div><div class="stat"><span>YTD</span><b class="' + cls(o.rytd || 0) + '">' + pct(o.rytd, 1) + "</b></div>" +
      (o.cls === "stock" ? '<div class="stat"><span>P/E · Yield</span><b style="font-size:.95rem">' + (o.pe ? o.pe.toFixed(1) : "—") + " · " + (o.div != null ? o.div.toFixed(2) + "%" : "—") + '</b></div><div class="stat"><span>Smart Score</span><b>' + smartScore(o) + "/100</b></div>" : "") +
      '</div><p class="xs muted" style="margin-top:6px">Snapshot as of ' + esc(when(o.asOf)) + ". Live chart below.</p>" : "";
    d.innerHTML = '<button class="icon-btn drawer-close" aria-label="Close">✕</button><span class="eyebrow">Live chart</span><h2 style="margin-top:8px">' + esc(sym) + "<small>" + esc(o ? o.name : tvs) + "</small></h2>" +
      '<div class="row" style="margin-top:12px;--gap:8px"><button class="btn sm d-watch" type="button">' + (inW ? "✓ On watchlist" : "+ Add to watchlist") + '</button><a class="btn sm" href="/championship.html#play">Trade in the championship</a></div>' + stats +
      '<div class="tv-box" data-tv="symbol-overview" data-symbol="' + esc(tvs) + '" style="height:320px"></div>' +
      '<div class="tv-box" data-tv="technical-analysis" data-symbol="' + esc(tvs) + '" style="height:420px"></div>' +
      (isStock ? '<div class="tv-box" data-tv="symbol-profile" data-symbol="' + esc(tvs) + '" style="height:380px"></div>' : "") +
      '<div class="panel" style="margin-top:14px;background:var(--accent-soft);border-color:transparent"><b>Not sure what to do with ' + esc(sym) + '?</b><p class="small muted" style="margin-top:4px">A licensed professional can review how it fits your plan.</p><a class="btn primary sm" style="margin-top:10px" href="/get-matched.html">Free advisor request</a></div>' +
      '<p class="xs muted" style="margin-top:12px">Information only, not a recommendation to buy or sell.</p>';
    document.body.appendChild(scrim); document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add("open"); });
    $$("[data-tv]", d).forEach(mountTV);
    function close() { d.remove(); scrim.remove(); document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", key);
    scrim.addEventListener("click", close); $(".drawer-close", d).addEventListener("click", close);
    $(".d-watch", d).addEventListener("click", function () {
      var l = watch(), i = l.indexOf(sym);
      if (i >= 0) l.splice(i, 1); else l.unshift(sym);
      setWatch(l.slice(0, 20)); this.textContent = i >= 0 ? "+ Add to watchlist" : "✓ On watchlist"; toast(i >= 0 ? sym + " removed from watchlist" : sym + " added to watchlist");
    });
  }
  function universe() {
    var u = {}; (MKT ? MKT.items : []).forEach(function (o) { u[o.sym] = o.name; });
    (D.crypto || []).forEach(function (c) { if (!u[c[0]]) u[c[0]] = c[1]; });
    return Object.keys(u).map(function (k) { return [k, u[k]]; });
  }
  function openSearch() {
    var m = modal('<h3>Look up any stock, ETF or crypto</h3><p class="small muted" style="margin-top:4px">Type a ticker (AAPL, SHOP.TO, RELIANCE) or pick from the list.</p><form class="q-form" style="margin-top:14px"><label class="sr-only" for="q-in">Symbol</label><div class="inline-form"><input id="q-in" autocomplete="off" placeholder="e.g. NVDA" /><button class="btn primary" type="submit">Open</button></div></form><ul class="q-list"></ul>');
    var inp = $("#q-in", m), ul = $(".q-list", m);
    function draw() {
      var q = inp.value.trim().toLowerCase();
      ul.innerHTML = universe().filter(function (x) { return !q || x[0].toLowerCase().indexOf(q) === 0 || x[1].toLowerCase().indexOf(q) >= 0; }).slice(0, 12)
        .map(function (x) { return '<li><button type="button" data-s="' + esc(x[0]) + '"><b class="sym">' + esc(x[0]) + '</b><span class="small muted">' + esc(x[1]) + "</span></button></li>"; }).join("");
      $$("[data-s]", ul).forEach(function (b) { b.addEventListener("click", function () { m.close(); openSymbol(b.getAttribute("data-s")); }); });
    }
    inp.addEventListener("input", draw);
    $(".q-form", m).addEventListener("submit", function (e) { e.preventDefault(); var v = inp.value.trim(); if (!v) return; m.close(); openSymbol(v); });
    draw(); setTimeout(function () { inp.focus(); }, 30);
  }

  /* ------------------------------------------------------------ calculators */
  var CALCS = {
    compound: { label: "Compound interest", inputs: [["start", "Starting amount ($)", 10000], ["monthly", "Monthly contribution ($)", 500], ["rate", "Annual return (%)", 7, 0.1], ["years", "Years", 25]],
      run: function (v) {
        var r = v.rate / 100 / 12, bal = v.start, inv = v.start, A = [v.start], B = [0];
        for (var y = 1; y <= Math.min(v.years, 80); y++) { for (var m = 0; m < 12; m++) { bal = bal * (1 + r) + v.monthly; inv += v.monthly; } A.push(inv); B.push(Math.max(0, bal - inv)); }
        return { stats: [["Future value", money(bal)], ["Your contributions", money(inv)], ["Growth earned", money(bal - inv)]], series: [{ name: "Contributions", color: "--ink-3", data: A }, { name: "Growth", color: "--accent", data: B }], stacked: true, x: function (i) { return "Y" + i; },
          note: "Estimates assume a constant return compounded monthly; real returns vary year to year." };
      } },
    retirement: { label: "Retirement / FIRE", inputs: [["age", "Current age", 35], ["retire", "Retirement age", 62], ["savings", "Current savings ($)", 80000], ["monthly", "Monthly saving ($)", 1000], ["rate", "Return before retirement (%)", 6, 0.1], ["spend", "Annual spending in retirement ($)", 60000], ["pension", "Expected pension / CPP / Social Security ($/yr)", 20000], ["swr", "Safe withdrawal rate (%)", 4, 0.1]],
      run: function (v) {
        var yrs = Math.max(0, v.retire - v.age), bal = v.savings, r = v.rate / 100 / 12, P = [bal];
        var target = Math.max(0, v.spend - v.pension) / (v.swr / 100 || 0.04);
        for (var y = 1; y <= Math.min(yrs, 70); y++) { for (var m = 0; m < 12; m++) bal = bal * (1 + r) + v.monthly; P.push(bal); }
        var T = P.map(function () { return target; }), gap = bal - target;
        return { stats: [["Target nest egg", money(target)], ["Projected at " + v.retire, money(bal)], [gap >= 0 ? "On track · surplus" : "Shortfall", money(Math.abs(gap))]], series: [{ name: "Projected savings", color: "--accent", data: P }, { name: "Target", color: "--amber", data: T, fill: false }], x: function (i) { return v.age + i; },
          note: gap >= 0 ? "On these assumptions you reach your target. Stress-test with a lower return." : "To close the gap, save about " + money(gap * -1 * (r || 0.004) / ((Math.pow(1 + (r || 0.004), yrs * 12) - 1) || 1), 0) + " more per month, retire later or plan to spend less." };
      } },
    mortgage: { label: "Mortgage", inputs: [["price", "Home price ($)", 650000], ["down", "Down payment (%)", 20, 0.5], ["rate", "Interest rate (%)", 5.25, 0.01], ["years", "Amortization (years)", 25], ["extra", "Extra monthly payment ($)", 0]],
      run: function (v) {
        var L = v.price * (1 - v.down / 100), i = v.rate / 1200, n = v.years * 12;
        var pay = i ? L * i / (1 - Math.pow(1 + i, -n)) : L / n;
        function sim(extra) { var b = L, t = 0, k = 0, pts = [b]; while (b > 0.01 && k < 1200) { var it = b * i; t += it; b = b + it - pay - extra; k++; if (k % 12 === 0) pts.push(Math.max(0, b)); } if (k % 12) pts.push(0); return { t: t, k: k, pts: pts }; }
        var a = sim(0), b = sim(v.extra);
        while (b.pts.length < a.pts.length) b.pts.push(0);
        var stats = [["Monthly payment", money(pay + v.extra, 2)], ["Total interest", money(b.t)], ["Paid off in", (b.k / 12).toFixed(1) + " years"]];
        return { stats: stats, series: [{ name: "Balance", color: "--ink-3", data: a.pts, alpha: .1 }].concat(v.extra > 0 ? [{ name: "With extra payments", color: "--accent", data: b.pts }] : []), x: function (i) { return "Y" + i; },
          note: v.extra > 0 ? "Extra payments save " + money(a.t - b.t) + " in interest and " + ((a.k - b.k) / 12).toFixed(1) + " years. Loan amount: " + money(L) + "." : "Loan amount " + money(L) + ". Add an extra monthly payment to see the interest you'd save. Excludes taxes, insurance and fees." };
      } },
    loan: { label: "Loan / EMI", inputs: [["amount", "Loan amount ($)", 30000], ["rate", "Interest rate (%)", 8.5, 0.01], ["years", "Term (years)", 5]],
      run: function (v) {
        var i = v.rate / 1200, n = Math.max(1, v.years * 12), emi = i ? v.amount * i / (1 - Math.pow(1 + i, -n)) : v.amount / n;
        var b = v.amount, P = [b], I = [0], ti = 0;
        for (var k = 1; k <= n; k++) { var it = b * i; ti += it; b = b + it - emi; if (k % 12 === 0 || k === n) { P.push(Math.max(0, b)); I.push(ti); } }
        return { stats: [["Monthly payment (EMI)", money(emi, 2)], ["Total interest", money(ti)], ["Total paid", money(emi * n)]], series: [{ name: "Balance owed", color: "--accent", data: P }, { name: "Interest paid so far", color: "--down", data: I }], x: function (i) { return "Y" + i; },
          note: "Standard amortizing loan with a fixed rate. Fees and insurance are not included." };
      } },
    dividend: { label: "Dividend income", inputs: [["amount", "Investment ($)", 50000], ["yield", "Dividend yield (%)", 3.5, 0.1], ["dg", "Dividend growth per year (%)", 5, 0.1], ["pg", "Price growth per year (%)", 4, 0.1], ["years", "Years", 20], ["drip", "Reinvest dividends? (1 = yes, 0 = no)", 1]],
      run: function (v) {
        var shares = 1, price = v.amount, dps = v.amount * v.yield / 100, tot = 0, V = [v.amount], INC = [dps];
        for (var y = 1; y <= Math.min(v.years, 60); y++) {
          var inc = shares * dps; tot += inc;
          price *= 1 + v.pg / 100; if (v.drip >= 1) shares += inc / price;
          dps *= 1 + v.dg / 100; V.push(shares * price); INC.push(shares * dps);
        }
        return { stats: [["Annual income in year " + v.years, money(INC[INC.length - 1])], ["Total dividends", money(tot)], ["Portfolio value", money(V[V.length - 1])]], series: [{ name: "Portfolio value", color: "--accent", data: V }], x: function (i) { return "Y" + i; },
          note: "Monthly income at the end: " + money(INC[INC.length - 1] / 12) + ". Dividends are not guaranteed and can be cut." };
      } },
    position: { label: "Position size", inputs: [["account", "Account size ($)", 25000], ["risk", "Risk per trade (%)", 1, 0.1], ["entry", "Entry price ($)", 50, 0.01], ["stop", "Stop-loss price ($)", 46, 0.01]],
      run: function (v) {
        var per = Math.abs(v.entry - v.stop), riskAmt = v.account * v.risk / 100, sh = per ? Math.floor(riskAmt / per) : 0;
        return { stats: [["Shares to buy", sh.toLocaleString()], ["Position value", money(sh * v.entry)], ["Max loss at stop", money(sh * per)]], series: null,
          note: "Position is " + (v.account ? (sh * v.entry / v.account * 100).toFixed(1) : 0) + "% of the account. Gaps can move past a stop, so real losses can be larger." };
      } },
    inflation: { label: "Inflation", inputs: [["amount", "Amount today ($)", 10000], ["rate", "Inflation rate (%)", 3, 0.1], ["years", "Years", 20]],
      run: function (v) {
        var P = [], C = [];
        for (var y = 0; y <= Math.min(v.years, 80); y++) { P.push(v.amount / Math.pow(1 + v.rate / 100, y)); C.push(v.amount * Math.pow(1 + v.rate / 100, y)); }
        var last = P[P.length - 1];
        return { stats: [["Buying power later", money(last)], ["Lost to inflation", money(v.amount - last)], ["Same basket will cost", money(C[C.length - 1])]], series: [{ name: "Buying power of today's money", color: "--down", data: P }], x: function (i) { return "Y" + i; },
          note: "Cash earning less than inflation loses value every year." };
      } },
    fees: { label: "Fee impact", inputs: [["amount", "Portfolio ($)", 100000], ["monthly", "Monthly contribution ($)", 0], ["rate", "Return before fees (%)", 7, 0.1], ["years", "Years", 30], ["feeA", "Higher fee (%)", 1, 0.01], ["feeB", "Lower fee (%)", 0.05, 0.01]],
      run: function (v) {
        function sim(fee) { var b = v.amount, r = (v.rate - fee) / 1200, pts = [b]; for (var y = 1; y <= Math.min(v.years, 70); y++) { for (var m = 0; m < 12; m++) b = b * (1 + r) + v.monthly; pts.push(b); } return pts; }
        var A = sim(v.feeA), B = sim(v.feeB), a = A[A.length - 1], b = B[B.length - 1];
        return { stats: [["With " + v.feeA + "% fee", money(a)], ["With " + v.feeB + "% fee", money(b)], ["Cost of the higher fee", money(b - a)]], series: [{ name: v.feeB + "% fee", color: "--up", data: B, fill: false }, { name: v.feeA + "% fee", color: "--down", data: A, fill: false }], x: function (i) { return "Y" + i; },
          note: "The higher fee consumes " + (b ? ((b - a) / b * 100).toFixed(0) : 0) + "% of your potential ending balance." };
      } }
  };
  var calcDraws = [];
  function initCalc(el) {
    var keys = (el.getAttribute("data-calcs") || "compound,retirement,mortgage,loan,dividend,position,inflation,fees").split(",").filter(function (k) { return CALCS[k]; });
    if (!keys.length) return;
    var hash = location.hash.replace("#", ""), cur = keys.indexOf(hash) >= 0 ? hash : keys[0];
    var uid = el.id || ("c" + Math.random().toString(36).slice(2, 7));
    function draw() {
      var def = CALCS[cur], vals = {};
      el.innerHTML = (keys.length > 1 ? '<div class="tabs" role="tablist">' + keys.map(function (k) { return '<button class="tab" role="tab" data-k="' + k + '" aria-selected="' + (k === cur) + '">' + CALCS[k].label + "</button>"; }).join("") + "</div>" : "") +
        '<div class="calc"><div class="stack" style="--gap:12px">' + def.inputs.map(function (inp) {
          var id = uid + "-" + inp[0], saved = store.get("sm_calc_" + cur, {})[inp[0]];
          return '<div class="field"><label for="' + id + '">' + inp[1] + '</label><input id="' + id + '" data-in="' + inp[0] + '" type="number" step="' + (inp[3] || 1) + '" value="' + (saved != null ? saved : inp[2]) + '" inputmode="decimal" /></div>';
        }).join("") + '<p class="xs muted">Estimates for education only; not financial advice.</p></div><div class="stack" style="--gap:14px"><div class="calc-out"></div><div class="legend"></div><canvas class="chart"></canvas><p class="small muted c-note"></p><a class="btn amber block" href="/get-matched.html">Want a professional to check these numbers? Request a free consultation →</a></div></div>';
      function compute() {
        $$("[data-in]", el).forEach(function (i) { vals[i.getAttribute("data-in")] = num(i.value); });
        store.set("sm_calc_" + cur, vals);
        var r = def.run(vals);
        $(".calc-out", el).innerHTML = r.stats.map(function (s) { return '<div class="stat"><span>' + esc(s[0]) + "</span><b>" + esc(s[1]) + "</b></div>"; }).join("");
        $(".c-note", el).textContent = r.note || "";
        var cv = $("canvas", el);
        if (r.series) { cv.hidden = false; $(".legend", el).innerHTML = r.series.map(function (s) { return '<span><i style="background:var(' + s.color + ')"></i>' + esc(s.name) + "</span>"; }).join(""); chart(cv, r.series, { stacked: r.stacked, xLabel: r.x }); }
        else { cv.hidden = true; $(".legend", el).innerHTML = ""; }
        el._redraw = function () { if (r.series) chart(cv, r.series, { stacked: r.stacked, xLabel: r.x }); };
      }
      $$("[data-in]", el).forEach(function (i) { i.addEventListener("input", compute); });
      $$("[data-k]", el).forEach(function (b) { b.addEventListener("click", function () { cur = b.getAttribute("data-k"); if (keys.length > 2) history.replaceState(null, "", "#" + cur); draw(); }); });
      compute();
    }
    draw();
    calcDraws.push(function () { el._redraw && el._redraw(); });
    if (keys.length > 2) window.addEventListener("hashchange", function () { var h = location.hash.replace("#", ""); if (keys.indexOf(h) >= 0 && h !== cur) { cur = h; draw(); } });
  }

  /* ------------------------------------------------------------ forms */
  function dest() { return C.form && C.form.alias ? C.form.alias : atob((C.form && C.form.k) || "").split("").reverse().join(""); }
  function submitForm(type, data) {
    var payload = {}; for (var k in data) payload[k] = data[k];
    payload._type = type; payload.page = location.pathname; payload.submitted = new Date().toISOString();
    if (payload.company_website) return Promise.resolve(true); // bot
    delete payload.company_website;
    function direct() {
      var body = {}; for (var k in payload) body[k] = payload[k];
      body._subject = "Smart.Market — new " + type + " submission"; body._template = "table"; body._captcha = "false";
      if (body.email) body._replyto = body.email;
      return fetch("https://formsubmit.co/ajax/" + dest(), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw 0; return j; }); })
        .then(function () { return true; });
    }
    var p = C.apiBase ? fetch(C.apiBase.replace(/\/$/, "") + "/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(function (r) { if (!r.ok) throw 0; return true; }).catch(direct) : direct();
    return p.then(function (ok) {
      var log = store.get("sm_sent", []); log.push({ type: type, at: payload.submitted }); store.set("sm_sent", log.slice(-20));
      if (window.gtag) gtag("event", "generate_lead", { form_type: type });
      return ok;
    });
  }
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validate(scope) {
    var ok = true, first = null;
    $$(".err", scope).forEach(function (e) { e.remove(); });
    $$("input,select,textarea", scope).forEach(function (i) {
      if (i.type === "hidden" || i.classList.contains("hp") || i.closest("[hidden]")) return;
      i.classList.remove("invalid");
      var bad = false, v = (i.value || "").trim();
      if (i.required && (i.type === "checkbox" ? !i.checked : !v)) bad = true;
      if (!bad && v && i.type === "email" && !EMAIL.test(v)) bad = true;
      if (!bad && v && i.type === "url" && !/^https?:\/\/\S+\.\S+/.test(v)) bad = true;
      if (!bad && v && i.type === "tel" && v.replace(/\D/g, "").length < 7) bad = true;
      if (bad) {
        ok = false; i.classList.add("invalid"); first = first || i;
        var m = document.createElement("div"); m.className = "err";
        m.textContent = i.type === "checkbox" ? "Please tick this box to continue." : i.type === "email" ? "Enter a valid email address." : i.type === "url" ? "Enter a full link starting with https://" : i.type === "tel" ? "Enter a valid phone number." : "This field is required.";
        (i.closest("label.check") || i).insertAdjacentElement("afterend", m);
      }
    });
    if (first) first.focus();
    return ok;
  }
  function serialize(scope) {
    var d = {};
    $$("input,select,textarea", scope).forEach(function (i) {
      if (!i.name) return;
      if (i.type === "checkbox") { d[i.name] = i.checked ? (i.value && i.value !== "on" ? i.value : "yes") : "no"; return; }
      if (i.type === "radio" && !i.checked) return;
      d[i.name] = i.value;
    });
    return d;
  }
  function bindForm(f) {
    if (f._bound) return; f._bound = 1;
    f.setAttribute("novalidate", "");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(f)) return;
      var type = f.getAttribute("data-form"), data = serialize(f), btn = $('[type="submit"]', f), lab = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      submitForm(type, data).then(function () {
        var msg = (f.getAttribute("data-success") || "Thank you|We'll be in touch.").split("|");
        document.dispatchEvent(new CustomEvent("sm:submitted", { detail: { type: type, data: data, form: f } }));
        if (f.getAttribute("data-replace") === "no") { toast("✓ " + msg[0]); f.reset(); if (btn) { btn.disabled = false; btn.innerHTML = lab; } fillSeason(); return; }
        var ok = document.createElement("div"); ok.className = "ok-panel"; ok.setAttribute("role", "status");
        ok.innerHTML = "<h3>✓ " + esc(msg[0]) + "</h3>" + (msg[1] ? "<p>" + esc(msg[1]) + "</p>" : "");
        f.replaceWith(ok);
      }, function () {
        if (btn) { btn.disabled = false; btn.innerHTML = lab; }
        toast("Sorry, that didn't send. Please check your connection and try again.");
      });
    });
  }

  /* ------------------------------------------------------------ advisor funnel */
  function initFunnel(el) {
    var steps = $$(".step", el), i = 0, data = {}, total = steps.length - 1;
    var next = $(".f-next", el), back = $(".f-back", el), lab = $(".step-lab", el), bar = $(".progress i", el);
    var qs = new URLSearchParams(location.search);
    function show(n) {
      i = n; steps.forEach(function (s, k) { s.classList.toggle("active", k === i); });
      var s = steps[i], done = i === total;
      lab.textContent = done ? "Request received" : "Step " + (i + 1) + " of " + total;
      bar.style.width = (done ? 100 : i / total * 100) + "%";
      back.hidden = i === 0 || done;
      var cta = s.getAttribute("data-cta");
      next.hidden = done || !cta && s.hasAttribute("data-auto");
      if (cta) next.textContent = cta;
      $(".f-nav", el).hidden = done;
      if (!done && i > 0) { var t = el.getBoundingClientRect().top; if (t < 0) window.scrollBy({ top: t - 90, behavior: "smooth" }); }
      var fi = $("input:not([type=hidden]):not([type=checkbox]),select", s); if (fi && i > 0 && !("ontouchstart" in window)) setTimeout(function () { fi.focus(); }, 60);
    }
    $$(".tile", el).forEach(function (t) {
      t.addEventListener("click", function () {
        var name = t.getAttribute("data-name");
        $$('.tile[data-name="' + name + '"]', el).forEach(function (x) { x.setAttribute("aria-pressed", x === t); });
        data[name] = t.getAttribute("data-value");
        if (steps[i].hasAttribute("data-auto")) setTimeout(function () { show(i + 1); }, 220);
      });
    });
    var zip = $("#f-zip", el); if (zip) zip.addEventListener("input", function () { $(".zip-note", el).hidden = zip.value.trim().length < 3; });
    next.addEventListener("click", function () {
      var s = steps[i];
      if (s.hasAttribute("data-auto")) { var nm = $(".tile", s).getAttribute("data-name"); if (!data[nm]) { toast("Choose an option to continue."); return; } return show(i + 1); }
      if (!validate(s)) return;
      var vals = serialize(s); for (var k in vals) data[k] = vals[k];
      if (!s.hasAttribute("data-final")) return show(i + 1);
      next.disabled = true; next.textContent = "Sending…";
      submitForm("advisor-lead", data).then(function () {
        $(".m-name", el).textContent = data.first_name || "there";
        if (data.newsletter_optin === "yes") submitForm("newsletter", { email: data.email, first_name: data.first_name, source: "advisor-funnel" }).catch(function () { });
        next.disabled = false; show(total);
        document.dispatchEvent(new CustomEvent("sm:submitted", { detail: { type: "advisor-lead", data: data } }));
      }, function () { next.disabled = false; next.textContent = s.getAttribute("data-cta"); toast("Sorry, that didn't send. Please try again."); });
    });
    back.addEventListener("click", function () { if (i > 0) show(i - 1); });
    var g = qs.get("goal"), pre = g && $('.tile[data-name="goal"][data-value="' + g + '"]', el);
    show(0);
    if (pre) pre.click();
  }

  /* ------------------------------------------------------------ championship */
  function initCountdowns() {
    var els = $$('[data-widget="countdown"]'); if (!els.length) return;
    function tick() {
      var ms = Math.max(0, SEASON.end - Date.now()), d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
      var html = [[d, "days"], [h, "hours"], [m, "min"], [s, "sec"]].map(function (p) { return "<div><b>" + String(p[0]).padStart(2, "0") + "</b><span>" + p[1] + "</span></div>"; }).join("");
      els.forEach(function (el) { el.innerHTML = html; });
    }
    tick(); setInterval(tick, 1000);
  }
  function initPrizes(el) {
    var c = C.contest || {}, p = c.prizes || [];
    el.innerHTML = '<div class="grid g3">' + p.map(function (x, k) { return '<div class="prize' + (k === 0 ? " first" : "") + '"><span class="place">' + esc(x.place) + "</span><b>" + esc(x.prize) + "</b></div>"; }).join("") + "</div>" +
      '<p class="xs" style="margin-top:10px;opacity:.8">' + (c.extras ? esc(c.extras) + ". " : "") + (c.prizesConfirmed ? "Prizes confirmed for this season." : "Prize targets for this season; final prizes are confirmed with sponsors before the season closes.") + "</p>";
  }
  function initContest(el) {
    var startCash = (C.contest && C.contest.startCash) || 100000, key = "sm_contest";
    var reg = $(".reg", el), game = $(".game", el), assets = {}, P = null;
    function getP() { var p = store.get(key, null); return p && p.season === SEASON.id ? p : null; }
    function save() { store.set(key, P); }
    function value() { var v = P.cash; for (var s in P.hold) { var a = assets[s]; v += P.hold[s].q * (a ? a.price : P.hold[s].cost); } return v; }
    function ret() { return (value() / startCash - 1) * 100; }
    function drawAll() {
      if (!P) return;
      $(".g-val", el).textContent = money(value(), 2); $(".g-cash", el).textContent = money(P.cash, 2);
      var r = ret(), ch = $(".g-ret", el); ch.textContent = pct(r); ch.className = "chip g-ret " + cls(r);
      var rows = Object.keys(P.hold).map(function (s) { var h = P.hold[s], a = assets[s], px = a ? a.price : h.cost, pl = (px - h.cost) * h.q; return '<tr><td><b class="sym">' + esc(s) + '</b></td><td class="r">' + fmt(h.q, h.q % 1 ? 4 : 0) + '</td><td class="r">' + fmt(h.cost) + '</td><td class="r">' + fmt(px) + '</td><td class="r">' + money(px * h.q, 2) + '</td><td class="r ' + cls(pl) + '">' + money(pl, 2) + "</td></tr>"; });
      $(".g-hold", el).innerHTML = rows.length ? '<div class="table-wrap"><table><thead><tr><th>Asset</th><th class="r">Qty</th><th class="r">Avg cost</th><th class="r">Price</th><th class="r">Value</th><th class="r">P/L</th></tr></thead><tbody>' + rows.join("") + "</tbody></table></div>" : '<p class="empty">No holdings yet. Pick an asset above and press Buy.</p>';
      drawLb();
    }
    function drawLb() {
      var list = [];
      if (P) list.push({ n: (P.handle || "You") + " (you)", r: ret(), me: true });
      [["SPX", "S&P 500"], ["NDX", "Nasdaq 100"], ["GC", "Gold"], ["BTC", "Bitcoin"]].forEach(function (b) { var o = BY[b[0]]; if (o && o.mtd != null) list.push({ n: b[1] + " (month to date)", r: o.mtd }); });
      if (list.length < 3 && window._cg) window._cg.slice(0, 2).forEach(function (c) { if (c.r7d != null) list.push({ n: c.name + " (7 days)", r: c.r7d }); });
      list.sort(function (a, b) { return b.r - a.r; });
      $(".lb", el).innerHTML = list.length ? '<table><thead><tr><th>#</th><th>Portfolio</th><th class="r">Return</th></tr></thead><tbody>' + list.map(function (x, k) { return '<tr class="' + (x.me ? "me-row" : "") + '"><td><span class="rank' + (k === 0 ? " r1" : "") + '">' + (k + 1) + "</span></td><td>" + esc(x.n) + '</td><td class="r ' + cls(x.r) + '">' + pct(x.r) + "</td></tr>"; }).join("") + "</tbody></table>" + (P ? "" : '<p class="xs muted" style="margin-top:8px">Register to put your portfolio on the board.</p>') : '<p class="empty">Benchmarks load with the next market update.</p>';
    }
    function fillAssets() {
      var sel = $(".g-sym", el), keys = Object.keys(assets).sort(function (a, b) { var o = { stock: 0, commodity: 1, crypto: 2 }; return (o[assets[a].cls] - o[assets[b].cls]) || a.localeCompare(b); });
      sel.innerHTML = keys.map(function (k) { var a = assets[k]; return '<option value="' + esc(k) + '">' + esc(k) + " · " + esc(a.name) + "</option>"; }).join("");
      $(".g-count", el).textContent = keys.length;
      showPx();
    }
    function showPx() { var a = assets[$(".g-sym", el).value]; $(".g-px", el).textContent = a ? "Price " + money(a.price, a.price < 2 ? 4 : 2) + " · day " + pct(a.chgPct) + (a.live ? " · live" : " · last close") : ""; }
    function trade(side) {
      if (!P) return;
      var s = $(".g-sym", el).value, a = assets[s], q = num($(".g-qty", el).value);
      if (!a || q <= 0) return toast("Choose an asset and a quantity.");
      var cost = q * a.price;
      if (side > 0) {
        if (cost > P.cash + 1e-6) return toast("Not enough cash. Max about " + fmt(P.cash / a.price, 4) + " units.");
        var h = P.hold[s] || { q: 0, cost: 0 }; h.cost = (h.cost * h.q + cost) / (h.q + q); h.q += q; P.hold[s] = h; P.cash -= cost;
        toast("Bought " + fmt(q, q % 1 ? 4 : 0) + " " + s);
      } else {
        var hh = P.hold[s]; if (!hh || hh.q < q - 1e-9) return toast("You don't hold that many " + s + ".");
        hh.q -= q; P.cash += cost; if (hh.q < 1e-9) delete P.hold[s];
        toast("Sold " + fmt(q, q % 1 ? 4 : 0) + " " + s);
      }
      P.trades = (P.trades || 0) + 1; save(); drawAll();
    }
    function start() { reg.hidden = true; game.hidden = false; drawAll(); }
    document.addEventListener("sm:submitted", function (e) {
      if (e.detail.type !== "contest-entry") return;
      P = { season: SEASON.id, handle: e.detail.data.handle, cash: startCash, hold: {}, joined: new Date().toISOString(), trades: 0 };
      save(); start();
    });
    $(".g-sym", el).addEventListener("change", showPx);
    $(".g-buy", el).addEventListener("click", function () { trade(1); });
    $(".g-sell", el).addEventListener("click", function () { trade(-1); });
    $(".g-reset", el).addEventListener("click", function () { if (!confirm("Reset your portfolio to $" + startCash.toLocaleString() + " cash?")) return; P.cash = startCash; P.hold = {}; save(); drawAll(); });
    P = getP(); if (P) start();
    mktReady.then(function () {
      if (MKT) MKT.items.forEach(function (o) { if (o.cls === "stock" || o.cls === "commodity" || o.cls === "crypto") assets[o.sym] = { name: o.name, price: o.price, chgPct: o.chgPct, cls: o.cls }; });
      return loadCrypto().then(function (l) { window._cg = l; l.forEach(function (c) { if (c.sym === "USDC") return; assets[c.sym] = { name: c.name, price: c.price, chgPct: c.chgPct, cls: "crypto", live: !!c.live }; }); }, function () { });
    }).then(function () { fillAssets(); drawAll(); drawLb(); });
    drawLb();
  }

  /* ------------------------------------------------------------ learn, glossary, quiz */
  function initLearnFilter(el) {
    var grid = $(el.getAttribute("data-target")); if (!grid) return;
    var cat = "", lvl = "";
    function run() {
      var n = 0;
      $$(".article-card", grid).forEach(function (c) { var ok = (!cat || c.getAttribute("data-cat") === cat) && (!lvl || c.getAttribute("data-level") === lvl); c.hidden = !ok; if (ok) n++; });
      var cnt = $(".lf-count", el); if (!cnt) { cnt = document.createElement("p"); cnt.className = "xs muted lf-count"; el.appendChild(cnt); } cnt.textContent = n + " guide" + (n === 1 ? "" : "s");
    }
    $$("[data-cat]", el).forEach(function (b) { b.addEventListener("click", function () { cat = b.getAttribute("data-cat"); $$("[data-cat]", el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); run(); }); });
    $$("[data-level]", el).forEach(function (b) { b.addEventListener("click", function () { lvl = b.getAttribute("data-level"); $$("[data-level]", el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); run(); }); });
    run();
  }
  function initGlossary(el) {
    var G = D.glossary || [], letters = Array.from(new Set(G.map(function (g) { return g[0][0].toUpperCase(); })));
    el.innerHTML = '<div class="field" style="margin-bottom:12px"><label for="gl-q">Search the glossary</label><input id="gl-q" type="search" placeholder="e.g. yield, ETF, beta" /></div><div class="seg" role="group" style="margin-bottom:16px"><button type="button" data-l="" aria-pressed="true">All</button>' + letters.map(function (l) { return '<button type="button" data-l="' + l + '" aria-pressed="false">' + l + "</button>"; }).join("") + '</div><dl class="gloss"></dl>';
    var q = "", l = "";
    function run() {
      $(".gloss", el).innerHTML = G.filter(function (g) { return (!l || g[0][0].toUpperCase() === l) && (!q || (g[0] + " " + g[1]).toLowerCase().indexOf(q) >= 0); })
        .map(function (g) { return '<div id="' + g[0].toLowerCase().replace(/[^a-z0-9]+/g, "-") + '"><dt>' + esc(g[0]) + "</dt><dd>" + esc(g[1]) + "</dd></div>"; }).join("") || '<p class="empty">No terms match.</p>';
    }
    $("#gl-q", el).addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); run(); });
    $$("[data-l]", el).forEach(function (b) { b.addEventListener("click", function () { l = b.getAttribute("data-l"); $$("[data-l]", el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); run(); }); });
    run();
  }
  function initTod(el) {
    var G = D.glossary || []; if (!G.length) return;
    var doy = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 864e5), g = G[doy % G.length];
    el.innerHTML = '<span class="eyebrow">Term of the day</span><h3 style="margin-top:8px">' + esc(g[0]) + '</h3><p class="small muted" style="margin-top:6px">' + esc(g[1]) + '</p><a class="small" style="display:inline-block;margin-top:8px" href="/glossary.html">Full glossary →</a>';
  }
  function initQuiz(el) {
    var Q = D.quiz || [], k = 0, score = 0;
    function draw() {
      if (k >= Q.length) { el.innerHTML = '<span class="eyebrow">Money IQ quiz</span><h3 style="margin-top:8px">You scored ' + score + " / " + Q.length + '</h3><p class="small muted" style="margin-top:6px">' + (score >= 5 ? "Excellent. Put it to work in the championship." : "Brush up with the Academy guides, then try again.") + '</p><div class="row" style="margin-top:10px"><button class="btn sm q-again" type="button">Try again</button><a class="btn primary sm" href="/championship.html">Enter the championship</a></div>'; $(".q-again", el).addEventListener("click", function () { k = 0; score = 0; draw(); }); return; }
      var q = Q[k];
      el.innerHTML = '<div class="row between"><span class="eyebrow">Money IQ quiz</span><span class="xs muted">' + (k + 1) + " / " + Q.length + '</span></div><h3 style="margin-top:8px;font-size:1.02rem">' + esc(q[0]) + "</h3>" + q[1].map(function (o, j) { return '<button type="button" class="quiz-opt" data-j="' + j + '">' + esc(o) + "</button>"; }).join("");
      $$(".quiz-opt", el).forEach(function (b) {
        b.addEventListener("click", function () {
          var j = +b.getAttribute("data-j"); if (j === q[2]) score++;
          $$(".quiz-opt", el).forEach(function (x, xi) { x.disabled = true; if (xi === q[2]) x.classList.add("right"); else if (xi === j) x.classList.add("wrong"); });
          setTimeout(function () { k++; draw(); }, 900);
        });
      });
    }
    draw();
  }

  /* ------------------------------------------------------------ compare: matcher + partner cards */
  function initMatcher(el) {
    var Qs = [["exp", "How experienced are you?", [["new", "Brand new"], ["some", "Some experience"], ["pro", "Experienced"]]],
      ["style", "How hands-on do you want to be?", [["auto", "Do it for me"], ["diy", "Buy and hold myself"], ["active", "Trade actively"]]],
      ["bal", "How much will you invest?", [["s", "Under $10K"], ["m", "$10K – $100K"], ["l", "Over $100K"]]]];
    var A = {};
    el.innerHTML = Qs.map(function (q) { return '<div style="margin-bottom:14px"><b class="small">' + esc(q[1]) + '</b><div class="seg" role="group" style="margin-top:6px;display:flex">' + q[2].map(function (o) { return '<button type="button" data-q="' + q[0] + '" data-v="' + o[0] + '" aria-pressed="false">' + esc(o[1]) + "</button>"; }).join("") + "</div></div>"; }).join("") + '<div class="match-out"></div>';
    function out() {
      if (!A.exp || !A.style || !A.bal) { $(".match-out", el).innerHTML = '<p class="xs muted">Answer all three to see your match.</p>'; return; }
      var r;
      if (A.bal === "l" && A.style !== "active") r = ["Fee-only planner or low-cost robo + planner", "With six figures, a fiduciary plan can be worth more than any app. Look for flat or hourly fees and verify registration.", "/get-matched.html", "Request a free consultation"];
      else if (A.style === "auto" || A.exp === "new") r = ["Robo-advisor", "Automatic diversified portfolios, rebalancing and low all-in fees (often 0.25%–0.50% including funds). Ideal if you want to set it and forget it.", "/learn/how-to-choose-a-brokerage-account.html", "How to choose a provider"];
      else if (A.style === "active") r = ["Full-featured online broker", "Advanced charting, fast execution, options and research. Watch for margin rates, currency conversion fees and the temptation to over-trade.", "/learn/how-to-use-a-stock-screener.html", "Sharpen your screening"];
      else r = ["Low-cost online broker", "Commission-free ETFs and stocks, fractional shares and automatic purchases. Build a simple index portfolio and rebalance once a year.", "/learn/index-funds-explained.html", "Index funds explained"];
      $(".match-out", el).innerHTML = '<div class="panel" style="background:var(--accent-soft);border-color:transparent"><span class="eyebrow">Your best fit</span><h3 style="margin-top:6px">' + esc(r[0]) + '</h3><p class="small muted" style="margin-top:6px">' + esc(r[1]) + '</p><a class="btn primary sm" style="margin-top:10px" href="' + r[2] + '">' + esc(r[3]) + " →</a></div>";
    }
    $$("[data-q]", el).forEach(function (b) { b.addEventListener("click", function () { var q = b.getAttribute("data-q"); A[q] = b.getAttribute("data-v"); $$('[data-q="' + q + '"]', el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); out(); }); });
    out();
  }
  function initPartners(el) {
    var P = C.partners || [];
    if (!P.length) { el.hidden = true; return; }
    el.innerHTML = '<p class="xs muted">Partner offers. We may earn a commission if you open an account; see our <a href="/terms.html#affiliate">advertiser disclosure</a>.</p>' + P.map(function (p) {
      return '<div class="panel offer"><div class="logo-box">' + esc(p.name) + '</div><div><b>' + esc(p.bestFor || "") + '</b><ul class="small muted" style="margin:6px 0 0;padding-left:18px">' + (p.points || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul></div><a class="btn primary" href="' + esc(p.url) + '" target="_blank" rel="sponsored noopener">Visit ' + esc(p.name) + "</a></div>";
    }).join("");
  }

  /* ------------------------------------------------------------ support: goal, wall, donate */
  function initGoal(el) {
    var d = C.donate || {}, g = d.goal || 25000, r = d.raised || 0, p = clamp(r / g * 100, 0, 100);
    el.innerHTML = '<div class="row between"><b>Launch goal: ' + money(g) + "</b>" + (r ? '<span class="num">' + p.toFixed(0) + "%</span>" : '<span class="chip amber">Founding supporters wanted</span>') + '</div><div class="goalbar" style="margin-top:10px"><i style="width:' + Math.max(p, 1.5) + '%"></i></div><div class="goal-meta"><span>' + money(r) + " raised</span><span>" + (d.supporters || []).length + " supporters</span></div>";
  }
  function initWall(el) {
    var S = (C.donate && C.donate.supporters) || [];
    el.innerHTML = S.length ? S.map(function (s) { return '<div class="wall-item"><b>' + esc(s.name) + '</b><span class="muted">' + (s.amount ? money(s.amount) + " · " : "") + esc(s.note || "") + "</span></div>"; }).join("") : '<p class="empty">Be one of our first founding supporters. Supporters who opt in are listed here.</p>';
  }
  var donateState = { freq: "monthly", amt: 15 };
  function initDonate(el) {
    var L = (C.donate && C.donate.links) || {};
    el.innerHTML = '<div class="seg" role="group" style="display:flex;margin-bottom:12px"><button type="button" data-f="monthly" aria-pressed="true">Monthly</button><button type="button" data-f="once" aria-pressed="false">One-time</button></div>' +
      '<div class="amounts">' + [5, 15, 50, 100].map(function (a) { return '<button type="button" class="amt" data-a="' + a + '" aria-pressed="false">$' + a + "</button>"; }).join("") + '</div>' +
      '<div class="field" style="margin-top:10px"><label for="don-custom">Other amount ($)</label><input id="don-custom" type="number" min="1" placeholder="Custom" /></div>' +
      '<div class="don-form stack" style="--gap:10px;margin-top:10px"><div class="field"><label for="don-name">Name (shown on the wall if you opt in)</label><input id="don-name" name="name" required autocomplete="name" /></div><div class="field"><label for="don-email">Email (for your payment link and receipt)</label><input id="don-email" name="email" type="email" required autocomplete="email" /></div><label class="check"><input type="checkbox" name="show_on_wall" checked /> <span>List my first name on the supporter wall</span></label><div class="field"><label for="don-note">Note (optional)</label><input id="don-note" name="note" maxlength="120" placeholder="Keep it free!" /></div><input type="text" name="company_website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true" /></div>' +
      '<button type="button" class="btn primary lg block don-go" style="margin-top:12px">Pledge</button><p class="xs muted" style="margin-top:8px">We\'ll email you a secure payment link (card or PayPal). Contributions are not tax-deductible.</p>' +
      ((L.paypal || L.buyMeACoffee || L.kofi) ? '<div class="row" style="--gap:6px;margin-top:10px">' + (L.paypal ? '<a class="btn sm" href="' + esc(L.paypal) + '" target="_blank" rel="noopener">PayPal</a>' : "") + (L.buyMeACoffee ? '<a class="btn sm" href="' + esc(L.buyMeACoffee) + '" target="_blank" rel="noopener">Buy Me a Coffee</a>' : "") + (L.kofi ? '<a class="btn sm" href="' + esc(L.kofi) + '" target="_blank" rel="noopener">Ko-fi</a>' : "") + "</div>" : "");
    function sync() {
      $$("[data-f]", el).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-f") === donateState.freq); });
      $$("[data-a]", el).forEach(function (b) { b.setAttribute("aria-pressed", +b.getAttribute("data-a") === donateState.amt); });
      $(".don-go", el).textContent = "Pledge $" + donateState.amt + (donateState.freq === "monthly" ? " / month" : "") + " →";
    }
    el._sync = sync;
    $$("[data-f]", el).forEach(function (b) { b.addEventListener("click", function () { donateState.freq = b.getAttribute("data-f"); sync(); }); });
    $$("[data-a]", el).forEach(function (b) { b.addEventListener("click", function () { donateState.amt = +b.getAttribute("data-a"); $("#don-custom", el).value = ""; sync(); }); });
    $("#don-custom", el).addEventListener("input", function (e) { var v = Math.round(num(e.target.value)); if (v > 0) { donateState.amt = v; sync(); } });
    $(".don-go", el).addEventListener("click", function () {
      var f = $(".don-form", el); if (!validate(f)) return;
      var data = serialize(f); data.amount = donateState.amt; data.frequency = donateState.freq;
      var btn = this; btn.disabled = true; btn.textContent = "Sending…";
      submitForm("pledge", data).then(function () {
        var link = donateState.freq === "monthly" ? L.monthly : L.once;
        el.innerHTML = '<div class="ok-panel" role="status"><h3>✓ Pledge received</h3><p>Thank you, ' + esc(data.name.split(" ")[0]) + "! We'll email a secure payment link for $" + donateState.amt + (donateState.freq === "monthly" ? " a month" : "") + " within one business day.</p>" + (link ? '<a class="btn primary" style="margin-top:12px" href="' + esc(link) + '" target="_blank" rel="noopener">Or pay securely now →</a>' : "") + "</div>";
      }, function () { btn.disabled = false; sync(); toast("Sorry, that didn't send. Please try again."); });
    });
    sync();
  }

  /* ------------------------------------------------------------ careers, share, misc */
  function initJobs(el) {
    var J = D.jobs || [];
    el.innerHTML = J.map(function (j, k) { return '<div class="panel job"><div><h3>' + esc(j[0]) + '</h3><div class="row" style="--gap:6px;margin-top:8px"><span class="chip accent">' + esc(j[1]) + '</span><span class="chip">' + esc(j[2]) + '</span><span class="chip">' + esc(j[3]) + '</span></div></div><a class="btn" href="#apply" data-job="' + k + '">Apply</a></div>'; }).join("");
    var sel = $("#ap-role");
    if (sel) sel.innerHTML = '<option value="">Select a role…</option>' + J.map(function (j) { return "<option>" + esc(j[0]) + "</option>"; }).join("") + "<option>General application</option>";
    $$("[data-job]", el).forEach(function (b) { b.addEventListener("click", function () { if (sel) sel.value = J[+b.getAttribute("data-job")][0]; }); });
  }
  function initShare() {
    var url = encodeURIComponent(location.href.split("#")[0]), t = encodeURIComponent(document.title);
    $$("[data-share]").forEach(function (el) {
      el.innerHTML = [["X", "https://twitter.com/intent/tweet?url=" + url + "&text=" + t], ["LinkedIn", "https://www.linkedin.com/sharing/share-offsite/?url=" + url], ["Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + url], ["WhatsApp", "https://wa.me/?text=" + t + "%20" + url], ["Reddit", "https://www.reddit.com/submit?url=" + url + "&title=" + t]]
        .map(function (s) { return '<a class="btn sm" href="' + s[1] + '" target="_blank" rel="noopener nofollow">' + s[0] + "</a>"; }).join("") + '<button class="btn sm" type="button" data-copy>Copy link</button>';
      $("[data-copy]", el).addEventListener("click", function () {
        var u = location.href.split("#")[0];
        (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { toast("Link copied"); }, function () { prompt("Copy this link:", u); });
      });
    });
  }
  function fillSeason() {
    $$("[data-season]").forEach(function (el) { el.textContent = SEASON.label; });
    $$("[data-season-input]").forEach(function (el) { el.value = SEASON.id; });
  }
  function cookieNotice() {
    if (store.get("sm_cookie", 0)) return;
    var c = document.createElement("div"); c.className = "cookie"; c.setAttribute("role", "region"); c.setAttribute("aria-label", "Cookie notice");
    c.innerHTML = '<b>Cookies.</b> We and our advertising partners (including Google) use cookies to show ads, measure traffic and keep Smart.Market free. Visitors in the EEA, UK and Switzerland are asked for consent through Google\'s certified consent message. <a href="/privacy.html#advertising">Privacy policy</a>.<div class="row"><button class="btn primary sm" type="button" data-ok>OK</button><a class="btn sm" href="/privacy.html#choices">Your choices</a></div>';
    document.body.appendChild(c);
    $("[data-ok]", c).addEventListener("click", function () { store.set("sm_cookie", 1); c.remove(); });
  }
  function exitIntent() {
    var pg = document.body.getAttribute("data-page");
    if (["get-matched", "playbook", "contact", "support", "partners", "careers"].indexOf(pg) >= 0) return;
    try { if (sessionStorage.getItem("sm_exit")) return; } catch (e) { return; }
    if (store.get("sm_sent", []).length || window.innerWidth < 900) return;
    var armed = false; setTimeout(function () { armed = true; }, 15000);
    document.addEventListener("mouseout", function h(e) {
      if (!armed || e.relatedTarget || e.clientY > 8) return;
      document.removeEventListener("mouseout", h);
      try { sessionStorage.setItem("sm_exit", "1"); } catch (er) { }
      var m = modal('<span class="eyebrow">Free guide · No sign-up needed</span><h2 style="margin-top:10px">Before you go: The Smart Investor Playbook</h2><p class="muted" style="margin-top:10px">A seven-step plan: foundation, the right accounts, a fee audit, a simple portfolio and a one-page checklist.</p><a class="btn amber lg block" style="margin-top:16px" href="/playbook.html">Read the Playbook free →</a><form data-form="newsletter" data-success="You\'re on the list|Watch your inbox for the next Smart Open." class="inline-form" style="margin-top:14px"><input type="hidden" name="source" value="exit-intent" /><label class="sr-only" for="ex-email">Email</label><input id="ex-email" name="email" type="email" required placeholder="Or get new guides by email" /><input type="text" name="company_website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true" /><button class="btn primary" type="submit">Join</button></form>');
      $$("form[data-form]", m).forEach(bindForm);
    });
  }

  /* ------------------------------------------------------------ boot */
  function boot() {
    var tl = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    $$("[data-today]").forEach(function (el) { el.textContent = tl; });
    fillSeason();
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-action]");
      if (a) {
        var act = a.getAttribute("data-action");
        if (act === "search") openSearch();
        if (act === "theme") {
          var nt = isDark() ? "light" : "dark"; document.documentElement.setAttribute("data-theme", nt); store.set("sm_theme", nt);
          document.dispatchEvent(new Event("sm:theme"));
        }
        if (act === "menu") { var n = $(".nav-links"), o = n.classList.toggle("open"); a.setAttribute("aria-expanded", o); }
      }
      var t = e.target.closest("[data-tier]");
      if (t) { donateState.freq = "monthly"; donateState.amt = +t.getAttribute("data-tier"); var dw = $('[data-widget="donate"]'); if (dw && dw._sync) dw._sync(); }
    });
    document.addEventListener("sm:theme", function () { remountTV(); calcDraws.forEach(function (f) { f(); }); $$('[data-widget="indices"]').forEach(function (el) { if (MKT) renderIndices(el); }); });
    $$("[data-lookup]").forEach(function (f) { f.addEventListener("submit", function (e) { e.preventDefault(); var i = $("input", f); if (i.value.trim()) openSymbol(i.value); }); });
    $$("form[data-form]").forEach(bindForm);
    initTV(document);

    var W = function (n, fn) { $$('[data-widget="' + n + '"]').forEach(function (el) { try { fn(el); } catch (err) { console.error(n, err); } }); };
    W("calc", initCalc); W("funnel", initFunnel); W("contest", initContest); W("prizes", initPrizes);
    W("learn-filter", initLearnFilter); W("glossary", initGlossary); W("tod", initTod); W("quiz", initQuiz);
    W("matcher", initMatcher); W("partners", initPartners); W("goal", initGoal); W("wall", initWall); W("donate", initDonate); W("jobs", initJobs);
    W("crypto", renderCrypto);
    initCountdowns(); initShare(); initBrief(); initNews(); initEarnings(); initVideos(); initFx(); renderWatchAll();
    mktReady.then(function () {
      if (!MKT) return;
      W("indices", renderIndices); W("movers", renderMovers); W("sectors", renderSectors); W("assets", renderAssets); W("screener", renderScreener);
      renderWatchAll();
    });
    setInterval(function () { loadCrypto(true).then(function () { W("crypto", renderCrypto); }, function () { }); }, 120000);
    var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { calcDraws.forEach(function (f) { f(); }); }, 150); });
    cookieNotice(); exitIntent();
    if (C.gaId && !window._smGA) {
      window._smGA = 1; var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + C.gaId; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); }; gtag("js", new Date()); gtag("config", C.gaId);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.SM = { openSymbol: openSymbol, submitForm: submitForm, season: SEASON };
})();
