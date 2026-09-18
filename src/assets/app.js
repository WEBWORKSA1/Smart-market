/* ==========================================================================
   Smart.Market — app.js
   Vanilla JS, no dependencies. Every feature self-initialises when its
   [data-widget] / [data-form] element exists on the page.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.SM_CONFIG || {}, D = window.SM_DATA || {};
  var SPA = !!window.SM_SPA;

  /* ---------- utils ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n, d) { if (d == null) d = n >= 1000 ? 2 : n >= 1 ? 2 : 4; return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function money(n, d) { return (n < 0 ? "-$" : "$") + fmt(Math.abs(n), d == null ? 0 : d); }
  function compact(n) { var a = Math.abs(n); if (a >= 1e12) return (n / 1e12).toFixed(2) + "T"; if (a >= 1e9) return (n / 1e9).toFixed(2) + "B"; if (a >= 1e6) return (n / 1e6).toFixed(2) + "M"; if (a >= 1e3) return (n / 1e3).toFixed(1) + "K"; return n.toFixed(0); }
  function pct(n, d) { return (n >= 0 ? "+" : "") + n.toFixed(d == null ? 2 : d) + "%"; }
  function cls(n) { return n >= 0 ? "up" : "down"; }
  var store = {
    get: function (k, f) { try { var v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var sess = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  function seeded(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  var today = new Date(); var daySeed = today.getFullYear() * 1000 + today.getMonth() * 40 + today.getDate();
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  function toast(msg) {
    var box = $(".toasts"); if (!box) { box = h("div", { class: "toasts", role: "status", "aria-live": "polite" }); document.body.appendChild(box); }
    var t = h("div", { class: "toast" }, esc(msg)); box.appendChild(t);
    setTimeout(function () { t.remove(); }, 4200);
  }
  function modal(html, wide) {
    var m = h("div", { class: "modal", role: "dialog", "aria-modal": "true" });
    m.innerHTML = '<div class="modal-box' + (wide ? " wide" : "") + '"><button class="icon-btn modal-close" aria-label="Close">✕</button>' + html + "</div>";
    function close() { m.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    m.addEventListener("click", function (e) { if (e.target === m || e.target.closest(".modal-close")) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(m);
    var f = m.querySelector("input,button:not(.modal-close)"); if (f) f.focus();
    return { el: m, close: close };
  }
  function pageLink(page) { return SPA ? "#/" + page : (page === "index" ? "index.html" : page + ".html"); }

  /* ---------- theme + nav ---------- */
  (function theme() {
    var saved = store.get("sm_theme", null);
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    $$("[data-action=theme]").forEach(function (b) {
      b.addEventListener("click", function () {
        var cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        var next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next); store.set("sm_theme", next);
        document.dispatchEvent(new CustomEvent("sm:redraw"));
      });
    });
  })();
  $$("[data-action=menu]").forEach(function (b) {
    b.addEventListener("click", function () { var n = $(".nav-links"); var o = n.classList.toggle("open"); b.setAttribute("aria-expanded", o); });
  });
  function markNav(page) {
    $$(".nav-links a").forEach(function (a) { if (a.dataset.page === page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    var n = $(".nav-links"); if (n) n.classList.remove("open");
  }
  $$("[data-year]").forEach(function (e) { e.textContent = today.getFullYear(); });
  $$("[data-season]").forEach(function (e) { e.textContent = (C.contest || {}).season || ""; });
  $$("[data-updated]").forEach(function (e) { e.textContent = today.toLocaleDateString("en-US", { month: "long", year: "numeric" }); });
  if (C.youtubeChannel) $$("#yt-sub").forEach(function (a) { a.href = C.youtubeChannel + "?sub_confirmation=1"; });

  /* ---------- UTM capture (attached to every form payload) ---------- */
  (function utm() {
    var p = new URLSearchParams(location.search), u = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "gclid"].forEach(function (k) { if (p.get(k)) u[k] = p.get(k); });
    if (Object.keys(u).length) store.set("sm_utm", u);
  })();

  /* ======================================================================
     MARKET ENGINE (demo) — deterministic per day, random-walk ticks
     ====================================================================== */
  var M = { all: {}, list: [], subs: [] };
  (function engine() {
    var r = seeded(daySeed);
    function add(sym, name, cls_, price, extra, vol) {
      var chg = (r() - 0.46) * (vol || 3.2);
      var prev = price / (1 + chg / 100);
      var hist = [], p = prev; for (var i = 0; i < 48; i++) { p = p * (1 + (r() - 0.5) * (vol || 3) / 100 / 5); hist.push(p); }
      var scale = price / hist[hist.length - 1]; hist = hist.map(function (x) { return x * scale; });
      var o = { sym: sym, name: name, cls: cls_, price: price, prev: prev, hist: hist, vol: vol || 3, volume: Math.round((extra && extra.mcap ? extra.mcap : 50) * (2e4 + r() * 6e4)) };
      if (extra) for (var k in extra) o[k] = extra[k];
      M.all[sym] = o; M.list.push(o);
    }
    (D.stocks || []).forEach(function (s) { add(s[0], s[1], "stock", s[3], { sector: s[2], mcap: s[4], pe: s[5], div: s[6], beta: s[7] }, 2.2 + s[7] * 1.4); });
    (D.indices || []).forEach(function (s) { add(s[0], s[1], "index", s[2], null, s[0] === "VIX" ? 9 : 1.6); });
    (D.crypto || []).forEach(function (s) { add(s[0], s[1], "crypto", s[2], null, 6); });
    (D.commodities || []).forEach(function (s) { add(s[0], s[1], "commodity", s[2], null, 2.4); });
    (D.fx || []).forEach(function (s) { add(s[0], s[1], "fx", s[2], null, 0.7); });
    (D.bonds || []).forEach(function (s) { add(s[0], s[1], "bond", s[2], null, 1.8); });
  })();
  M.chg = function (o) { return (o.price / o.prev - 1) * 100; };
  M.on = function (fn) { M.subs.push(fn); };
  setInterval(function () {
    if (document.hidden) return;
    var moved = [];
    for (var i = 0; i < 10; i++) {
      var o = M.list[Math.floor(Math.random() * M.list.length)];
      var old = o.price; o.price = o.price * (1 + (Math.random() - 0.5) * o.vol / 900);
      o.hist.push(o.price); if (o.hist.length > 80) o.hist.shift();
      o.dir = o.price >= old ? 1 : -1; moved.push(o);
    }
    M.subs.forEach(function (fn) { try { fn(moved); } catch (e) {} });
  }, 2600);
  function priceStr(o) { if (o.cls === "bond") return o.price.toFixed(3) + "%"; if (o.cls === "fx") return o.price.toFixed(o.price > 20 ? 2 : 4); return fmt(o.price, o.price < 2 ? 4 : 2); }

  /* ---------- sparkline + chart ---------- */
  function fitCanvas(cv, hgt) {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth || cv.parentNode.clientWidth || 300, hh = hgt || cv.clientHeight || 40;
    cv.width = w * dpr; cv.height = hh * dpr; var ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx: ctx, w: w, h: hh };
  }
  function spark(cv, data, up) {
    if (!cv || !cv.clientWidth) return;
    var f = fitCanvas(cv), ctx = f.ctx, w = f.w, hh = f.h;
    var min = Math.min.apply(null, data), max = Math.max.apply(null, data), rng = max - min || 1;
    var col = up ? css("--up") : css("--down");
    ctx.clearRect(0, 0, w, hh); ctx.beginPath();
    data.forEach(function (v, i) { var x = i / (data.length - 1) * w, y = hh - 3 - (v - min) / rng * (hh - 6); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.lineTo(w, hh); ctx.lineTo(0, hh); ctx.closePath();
    var g = ctx.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, col + "33"); g.addColorStop(1, col + "00"); ctx.fillStyle = g; ctx.fill();
  }
  /* series: [{data:[], color:'--accent', fill:true, label}] ; opts: {labels:[], money:true, stacked:bool, bars:bool} */
  function chart(cv, series, opts) {
    if (!cv || !cv.clientWidth) return;
    opts = opts || {};
    var f = fitCanvas(cv, cv.clientHeight || 280), ctx = f.ctx, w = f.w, hh = f.h;
    var pl = 64, pr = 12, pt = 12, pb = 28, iw = w - pl - pr, ih = hh - pt - pb;
    var n = series[0].data.length, max = 0;
    if (opts.stacked) { for (var i = 0; i < n; i++) { var s = 0; series.forEach(function (se) { s += se.data[i]; }); max = Math.max(max, s); } }
    else series.forEach(function (se) { se.data.forEach(function (v) { max = Math.max(max, v); }); });
    if (max <= 0) max = 1;
    var mag = Math.pow(10, Math.floor(Math.log10(max))), step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).find(function (s) { return max / s <= 5; }) || mag * 10;
    var top = Math.ceil(max / step) * step;
    ctx.clearRect(0, 0, w, hh);
    ctx.font = "11px " + css("--f-mono"); ctx.fillStyle = css("--ink-3"); ctx.strokeStyle = css("--line"); ctx.lineWidth = 1;
    for (var v = 0; v <= top + 1e-9; v += step) {
      var y = pt + ih - v / top * ih; ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(w - pr, y); ctx.stroke();
      ctx.textAlign = "right"; ctx.fillText((opts.money ? "$" : "") + compact(v), pl - 8, y + 4);
    }
    var labels = opts.labels || [], every = Math.ceil(n / Math.max(2, Math.floor(iw / 60)));
    ctx.textAlign = "center";
    for (var j = 0; j < n; j += every) ctx.fillText(labels[j] != null ? labels[j] : j, pl + (opts.bars ? (j + 0.5) / n : j / Math.max(1, n - 1)) * iw, hh - 8);
    var base = new Array(n).fill(0);
    series.forEach(function (se) {
      var col = css(se.color || "--accent");
      if (opts.bars) {
        var bw = iw / n * 0.7;
        se.data.forEach(function (v, i) { var x = pl + (i + 0.15) / n * iw, y0 = pt + ih - base[i] / top * ih, y1 = pt + ih - (base[i] + v) / top * ih; ctx.fillStyle = col; ctx.fillRect(x, y1, bw, y0 - y1); if (opts.stacked) base[i] += v; });
        return;
      }
      var pts = se.data.map(function (v, i) { var b = opts.stacked ? base[i] : 0; return [pl + i / Math.max(1, n - 1) * iw, pt + ih - (b + v) / top * ih, pt + ih - b / top * ih]; });
      ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.stroke();
      if (se.fill) {
        for (var k = pts.length - 1; k >= 0; k--) ctx.lineTo(pts[k][0], pts[k][2]);
        ctx.closePath(); ctx.globalAlpha = 0.22; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
      }
      var last = pts[pts.length - 1]; ctx.beginPath(); ctx.arc(last[0], last[1], 4, 0, 7); ctx.fillStyle = col; ctx.fill();
      if (opts.stacked) se.data.forEach(function (v, i) { base[i] += v; });
    });
  }

  /* ---------- ticker tape ---------- */
  (function tape() {
    var el = $("[data-widget=tape]"); if (!el) return;
    var syms = ["SPX", "NDX", "DJI", "TSX", "VIX", "BTC", "ETH", "GC", "CL", "US10Y", "EURUSD", "AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "SENSEX"];
    function item(o) { var c = M.chg(o); return '<span class="tape-item" data-t="' + o.sym + '"><b>' + o.sym + '</b><span class="p">' + priceStr(o) + '</span><span class="c ' + cls(c) + '">' + pct(c) + "</span></span>"; }
    var html = syms.map(function (s) { return M.all[s] ? item(M.all[s]) : ""; }).join("");
    el.innerHTML = '<div class="tape-track">' + html + html + "</div>";
    M.on(function (moved) {
      moved.forEach(function (o) { $$('[data-t="' + o.sym + '"]', el).forEach(function (n) { var c = M.chg(o); n.querySelector(".p").textContent = priceStr(o); var cc = n.querySelector(".c"); cc.textContent = pct(c); cc.className = "c " + cls(c); }); });
    });
  })();

  /* ---------- index cards ---------- */
  function renderIndices() {
    $$("[data-widget=indices]").forEach(function (el) {
      var syms = (el.dataset.syms || "SPX,NDX,DJI,TSX,BTC,GC").split(",");
      el.innerHTML = syms.map(function (s) { var o = M.all[s]; if (!o) return ""; var c = M.chg(o); return '<div class="idx" data-i="' + s + '"><span class="n">' + esc(o.name) + '</span><span class="p">' + priceStr(o) + '</span><span class="chip ' + cls(c) + '">' + pct(c) + '</span><canvas aria-hidden="true"></canvas></div>'; }).join("");
      $$(".idx", el).forEach(function (n) { var o = M.all[n.dataset.i]; spark(n.querySelector("canvas"), o.hist, M.chg(o) >= 0); });
    });
  }
  renderIndices();
  M.on(function (moved) {
    moved.forEach(function (o) {
      $$('.idx[data-i="' + o.sym + '"]').forEach(function (n) { var c = M.chg(o); n.querySelector(".p").textContent = priceStr(o); var ch = n.querySelector(".chip"); ch.textContent = pct(c); ch.className = "chip " + cls(c); spark(n.querySelector("canvas"), o.hist, c >= 0); });
    });
  });

  /* ---------- heatmap ---------- */
  function heatColor(c) {
    var a = Math.min(1, Math.abs(c) / 3);
    return c >= 0 ? "rgb(" + Math.round(40 - 20 * a) + "," + Math.round(110 + 50 * a) + "," + Math.round(80 - 10 * a) + ")" : "rgb(" + Math.round(150 + 70 * a) + "," + Math.round(60 - 20 * a) + "," + Math.round(60 - 15 * a) + ")";
  }
  function renderHeat() {
    $$("[data-widget=heatmap]").forEach(function (el) {
      var lim = +(el.dataset.limit || 48);
      var st = M.list.filter(function (o) { return o.cls === "stock"; }).sort(function (a, b) { return b.mcap - a.mcap; }).slice(0, lim);
      el.innerHTML = st.map(function (o) {
        var span = o.mcap > 2000 ? [3, 2] : o.mcap > 700 ? [2, 2] : o.mcap > 300 ? [2, 1] : [1, 1];
        var c = M.chg(o);
        return '<button class="heat-cell" data-sym="' + o.sym + '" style="grid-column:span ' + span[0] + ';grid-row:span ' + span[1] + ";background:" + heatColor(c) + '" title="' + esc(o.name) + '">' + o.sym + "<span>" + pct(c) + "</span></button>";
      }).join("");
    });
  }
  renderHeat();
  M.on(function (moved) { moved.forEach(function (o) { if (o.cls !== "stock") return; $$('.heat-cell[data-sym="' + o.sym + '"]').forEach(function (n) { var c = M.chg(o); n.style.background = heatColor(c); n.querySelector("span").textContent = pct(c); }); }); });

  /* ---------- movers ---------- */
  $$("[data-widget=movers]").forEach(function (el) {
    var mode = "gainers";
    var seg = h("div", { class: "seg", role: "group", "aria-label": "Movers view" }, '<button aria-pressed="true" data-m="gainers">Gainers</button><button aria-pressed="false" data-m="losers">Losers</button><button aria-pressed="false" data-m="active">Most active</button>');
    var tw = h("div", { class: "table-wrap" });
    el.appendChild(seg); el.appendChild(tw);
    seg.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; mode = b.dataset.m; $$("button", seg).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); draw(); });
    function draw() {
      var st = M.list.filter(function (o) { return o.cls === "stock"; });
      st.sort(mode === "gainers" ? function (a, b) { return M.chg(b) - M.chg(a); } : mode === "losers" ? function (a, b) { return M.chg(a) - M.chg(b); } : function (a, b) { return b.volume - a.volume; });
      tw.innerHTML = "<table><thead><tr><th>Symbol</th><th class=r>Price</th><th class=r>Change</th><th class=r>Volume</th></tr></thead><tbody>" +
        st.slice(0, +(el.dataset.limit || 8)).map(function (o) { var c = M.chg(o); return '<tr class="click" data-sym="' + o.sym + '"><td><span class="sym">' + o.sym + '</span><span class="sym-name">' + esc(o.name) + '</span></td><td class="r num">' + fmt(o.price, 2) + '</td><td class="r num ' + cls(c) + '">' + pct(c) + '</td><td class="r num">' + compact(o.volume) + "</td></tr>"; }).join("") + "</tbody></table>";
    }
    draw(); setInterval(function () { if (!document.hidden) draw(); }, 8000);
  });

  /* ---------- sentiment gauge + breadth ---------- */
  function renderSentiment() {
    $$("[data-widget=sentiment]").forEach(function (el) {
      var st = M.list.filter(function (o) { return o.cls === "stock"; });
      var adv = st.filter(function (o) { return M.chg(o) >= 0; }).length, dec = st.length - adv;
      var vix = M.all.VIX ? M.all.VIX.price : 16;
      var score = Math.max(2, Math.min(98, Math.round(adv / st.length * 70 + (30 - Math.min(30, vix)) * 1.2)));
      var label = score < 25 ? "Extreme fear" : score < 45 ? "Fear" : score < 56 ? "Neutral" : score < 76 ? "Greed" : "Extreme greed";
      var ang = Math.PI * (1 - score / 100), cx = 130, cy = 120, rr = 96;
      var nx = cx + Math.cos(ang) * (rr - 14), ny = cy - Math.sin(ang) * (rr - 14);
      function arc(a0, a1, col) { var x0 = cx + Math.cos(Math.PI * (1 - a0)) * rr, y0 = cy - Math.sin(Math.PI * (1 - a0)) * rr, x1 = cx + Math.cos(Math.PI * (1 - a1)) * rr, y1 = cy - Math.sin(Math.PI * (1 - a1)) * rr; return '<path d="M' + x0 + " " + y0 + " A" + rr + " " + rr + " 0 0 1 " + x1 + " " + y1 + '" stroke="' + col + '" stroke-width="16" fill="none"/>'; }
      el.innerHTML = '<svg class="gauge" viewBox="0 0 260 150" role="img" aria-label="Smart Sentiment ' + score + ", " + label + '">' +
        arc(0, .24, "var(--down)") + arc(.25, .44, "color-mix(in srgb,var(--down) 55%,var(--amber))") + arc(.45, .55, "var(--amber)") + arc(.56, .75, "color-mix(in srgb,var(--up) 55%,var(--amber))") + arc(.76, 1, "var(--up)") +
        '<line x1="' + cx + '" y1="' + cy + '" x2="' + nx + '" y2="' + ny + '" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="6" fill="var(--ink)"/>' +
        '<text x="' + cx + '" y="' + (cy + 26) + '" text-anchor="middle" fill="var(--ink)" style="font:700 22px var(--f-mono)">' + score + "</text></svg>" +
        '<p style="text-align:center;font-weight:700;margin-top:4px">' + label + "</p>" +
        '<div class="stack" style="--gap:6px;margin-top:14px"><div class="row between xs muted"><span>Advancing ' + adv + '</span><span>Declining ' + dec + '</span></div><div class="breadth" aria-hidden="true"><i style="width:' + (adv / st.length * 100) + '%;background:var(--up)"></i><i style="width:' + (dec / st.length * 100) + '%;background:var(--down)"></i></div></div>';
    });
  }
  renderSentiment(); setInterval(function () { if (!document.hidden) renderSentiment(); }, 10000);

  /* ---------- asset tables (tabs) ---------- */
  $$("[data-widget=assets]").forEach(function (el) {
    var tabs = [["stock", "Stocks"], ["index", "Indices"], ["crypto", "Crypto"], ["commodity", "Commodities"], ["fx", "Currencies"], ["bond", "Bond yields"]];
    var cur = "index";
    var tb = h("div", { class: "tabs", role: "tablist" }, tabs.map(function (t) { return '<button class="tab" role="tab" aria-selected="' + (t[0] === cur) + '" data-c="' + t[0] + '">' + t[1] + "</button>"; }).join(""));
    var tw = h("div", { class: "table-wrap" }); el.appendChild(tb); el.appendChild(tw);
    tb.addEventListener("click", function (e) { var b = e.target.closest(".tab"); if (!b) return; cur = b.dataset.c; $$(".tab", tb).forEach(function (x) { x.setAttribute("aria-selected", x === b); }); draw(); });
    function draw() {
      var rows = M.list.filter(function (o) { return o.cls === cur; });
      tw.innerHTML = '<table><thead><tr><th>Name</th><th class="r">Last</th><th class="r">Change</th><th class="r">% Chg</th><th>Trend</th></tr></thead><tbody>' + rows.map(function (o) {
        var c = M.chg(o), d = o.price - o.prev;
        return '<tr class="click" data-sym="' + o.sym + '"><td><span class="sym">' + o.sym + '</span><span class="sym-name">' + esc(o.name) + '</span></td><td class="r num" data-f="p">' + priceStr(o) + '</td><td class="r num ' + cls(c) + '" data-f="d">' + (d >= 0 ? "+" : "") + fmt(d, Math.abs(d) < 1 ? 4 : 2) + '</td><td class="r num ' + cls(c) + '" data-f="c">' + pct(c) + '</td><td><canvas style="width:110px;height:30px" aria-hidden="true"></canvas></td></tr>';
      }).join("") + "</tbody></table>";
      $$("tr[data-sym]", tw).forEach(function (r) { var o = M.all[r.dataset.sym]; spark(r.querySelector("canvas"), o.hist, M.chg(o) >= 0); });
    }
    draw();
    M.on(function (moved) { moved.forEach(function (o) { var r = $('tr[data-sym="' + o.sym + '"]', tw); if (!r) return; var c = M.chg(o), d = o.price - o.prev; r.querySelector('[data-f=p]').textContent = priceStr(o); var dd = r.querySelector("[data-f=d]"); dd.textContent = (d >= 0 ? "+" : "") + fmt(d, Math.abs(d) < 1 ? 4 : 2); dd.className = "r num " + cls(c); var cc = r.querySelector("[data-f=c]"); cc.textContent = pct(c); cc.className = "r num " + cls(c); r.classList.remove("flash-up", "flash-down"); void r.offsetWidth; r.classList.add(o.dir > 0 ? "flash-up" : "flash-down"); spark(r.querySelector("canvas"), o.hist, c >= 0); }); });
  });

  /* ---------- calendars ---------- */
  function dayLabel(off) { var d = new Date(today); d.setDate(d.getDate() + off); return off === 0 ? "Today" : off === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
  $$("[data-widget=econ]").forEach(function (el) {
    var lim = +(el.dataset.limit || 99);
    el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Time (ET)</th><th>Ctry</th><th>Event</th><th>Impact</th><th class="r">Forecast</th><th class="r">Prev.</th></tr></thead><tbody>' +
      (D.econ || []).slice(0, lim).map(function (e) { return "<tr><td>" + dayLabel(e[0]) + '</td><td class="num">' + e[1] + '</td><td><span class="chip">' + e[2] + "</span></td><td>" + esc(e[3]) + '</td><td><span class="chip ' + (e[4] === 3 ? "down" : "amber") + '">' + (e[4] === 3 ? "High" : "Medium") + '</span></td><td class="r num">' + e[5] + '</td><td class="r num">' + e[6] + "</td></tr>"; }).join("") + "</tbody></table></div>";
  });
  $$("[data-widget=earnings]").forEach(function (el) {
    el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Symbol</th><th>Timing</th><th class="r">EPS est.</th></tr></thead><tbody>' +
      (D.earnings || []).map(function (e) { return "<tr><td>" + dayLabel(e[0]) + '</td><td class="sym">' + e[1] + "</td><td>" + e[2] + '</td><td class="r num">$' + e[3] + "</td></tr>"; }).join("") + "</tbody></table></div>";
  });

  /* ---------- watchlist + alerts ---------- */
  var WL = store.get("sm_watch", ["AAPL", "NVDA", "BTC", "SPX"]);
  var ALERTS = store.get("sm_alerts", []);
  function renderWatch() {
    $$("[data-widget=watchlist]").forEach(function (el, wi) {
      var body = $(".wl-body", el);
      if (!body) {
        el.innerHTML = '<form class="inline-form wl-add" autocomplete="off"><label class="sr-only" for="wl-in' + wi + '">Add symbol</label><input id="wl-in' + wi + '" list="sm-syms" placeholder="Add symbol, e.g. MSFT" /><button class="btn primary sm">Add</button></form><div class="wl-body" style="margin-top:12px"></div>' +
          '<div class="panel" style="margin-top:14px;padding:14px"><h4>Price alert</h4><form class="alert-form row" style="margin-top:10px" autocomplete="off"><label class="sr-only" for="al-sym' + wi + '">Symbol</label><input id="al-sym' + wi + '" list="sm-syms" placeholder="Symbol" style="flex:1 1 90px" /><label class="sr-only" for="al-dir' + wi + '">Direction</label><select id="al-dir' + wi + '" style="flex:1 1 90px"><option value="above">rises above</option><option value="below">falls below</option></select><label class="sr-only" for="al-px' + wi + '">Price</label><input id="al-px' + wi + '" type="number" step="any" placeholder="Price" style="flex:1 1 90px" /><button class="btn sm">Set alert</button></form><div class="al-list xs muted" style="margin-top:8px"></div></div>';
        body = $(".wl-body", el);
        $(".wl-add", el).addEventListener("submit", function (e) { e.preventDefault(); var v = $("[id^=wl-in]", el).value.trim().toUpperCase(); if (!M.all[v]) { toast("Symbol not found in the demo dataset. Try AAPL, BTC, SPX…"); return; } if (WL.indexOf(v) < 0) WL.unshift(v); store.set("sm_watch", WL); $("[id^=wl-in]", el).value = ""; renderWatch(); toast(v + " added to your watchlist"); });
        $(".alert-form", el).addEventListener("submit", function (e) { e.preventDefault(); var s = $("[id^=al-sym]", el).value.trim().toUpperCase(), p = parseFloat($("[id^=al-px]", el).value); if (!M.all[s] || !(p > 0)) { toast("Enter a valid symbol and price."); return; } ALERTS.push({ s: s, d: $("[id^=al-dir]", el).value, p: p }); store.set("sm_alerts", ALERTS); renderWatch(); toast("Alert set: " + s + " " + $("[id^=al-dir]", el).value + " " + p); });
      }
      body.innerHTML = WL.length ? '<div class="table-wrap"><table><tbody>' + WL.map(function (s) { var o = M.all[s]; if (!o) return ""; var c = M.chg(o); return '<tr class="click" data-sym="' + s + '"><td><span class="sym">' + s + '</span><span class="sym-name">' + esc(o.name) + '</span></td><td class="r num">' + priceStr(o) + '</td><td class="r num ' + cls(c) + '">' + pct(c) + '</td><td class="r"><button class="btn ghost sm" data-rm="' + s + '" aria-label="Remove ' + s + '">✕</button></td></tr>'; }).join("") + "</tbody></table></div>" : '<p class="muted small">Your watchlist is empty.</p>';
      $(".al-list", el).innerHTML = ALERTS.length ? ALERTS.map(function (a, i) { return '<span class="chip" style="margin:3px 4px 0 0">' + a.s + " " + (a.d === "above" ? "≥" : "≤") + " " + a.p + ' <button data-al="' + i + '" style="background:none;border:0;cursor:pointer;color:inherit" aria-label="Delete alert">✕</button></span>'; }).join("") : "No alerts yet.";
    });
  }
  document.addEventListener("click", function (e) {
    var rm = e.target.closest("[data-rm]"); if (rm) { e.stopPropagation(); WL = WL.filter(function (x) { return x !== rm.dataset.rm; }); store.set("sm_watch", WL); renderWatch(); return; }
    var al = e.target.closest("[data-al]"); if (al) { ALERTS.splice(+al.dataset.al, 1); store.set("sm_alerts", ALERTS); renderWatch(); }
  }, true);
  renderWatch();
  M.on(function () {
    if (ALERTS.length) {
      var fired = [];
      ALERTS.forEach(function (a, i) { var o = M.all[a.s]; if (o && ((a.d === "above" && o.price >= a.p) || (a.d === "below" && o.price <= a.p))) { toast("🔔 Alert: " + a.s + " is " + priceStr(o) + " (" + a.d + " " + a.p + ")"); fired.push(i); } });
      if (fired.length) { ALERTS = ALERTS.filter(function (_, i) { return fired.indexOf(i) < 0; }); store.set("sm_alerts", ALERTS); }
    }
  });
  setInterval(function () { if (!document.hidden && $("[data-widget=watchlist]")) renderWatch(); }, 6000);
  (function datalist() { var dl = h("datalist", { id: "sm-syms" }); dl.innerHTML = M.list.map(function (o) { return '<option value="' + o.sym + '">' + esc(o.name) + "</option>"; }).join(""); document.body.appendChild(dl); })();

  /* ---------- stock drawer ---------- */
  function smartScore(o) {
    if (o.cls !== "stock") return null;
    var val = o.pe > 0 ? Math.max(0, 100 - o.pe * 1.3) : 20;
    var inc = Math.min(100, o.div * 22);
    var stab = Math.max(0, 100 - (o.beta - 0.4) * 45);
    var mom = Math.max(0, Math.min(100, 50 + M.chg(o) * 12));
    var size = Math.min(100, Math.log10(o.mcap + 1) * 28);
    return Math.round(val * .28 + inc * .17 + stab * .2 + mom * .15 + size * .2);
  }
  function openStock(sym) {
    var o = M.all[sym]; if (!o) return;
    var old = $(".drawer"); if (old) { old.remove(); $(".scrim") && $(".scrim").remove(); }
    var c = M.chg(o), sc = smartScore(o);
    var sc_ = h("div", { class: "scrim" }), dr = h("aside", { class: "drawer", role: "dialog", "aria-label": o.name });
    dr.innerHTML = '<div class="row between"><span class="chip accent">' + o.cls.toUpperCase() + (o.sector ? " · " + esc(o.sector) : "") + '</span><button class="icon-btn" data-close aria-label="Close">✕</button></div>' +
      '<h2 style="margin-top:14px">' + esc(o.name) + ' <span class="mono muted" style="font-size:1rem">' + o.sym + "</span></h2>" +
      '<div class="row" style="margin-top:8px"><span class="mono" style="font-size:1.8rem;font-weight:600">' + priceStr(o) + '</span><span class="chip ' + cls(c) + '">' + pct(c) + "</span></div>" +
      '<canvas class="chart" style="height:170px;margin-top:14px" aria-label="Intraday trend"></canvas>' +
      (o.cls === "stock" ? '<div class="calc-out" style="margin-top:14px"><div class="stat"><span>Mkt cap</span><b>$' + fmt(o.mcap, 0) + 'B</b></div><div class="stat"><span>P/E</span><b>' + (o.pe ? o.pe.toFixed(1) : "n/m") + '</b></div><div class="stat"><span>Div. yield</span><b>' + o.div.toFixed(2) + '%</b></div><div class="stat"><span>Beta</span><b>' + o.beta.toFixed(2) + '</b></div><div class="stat"><span>Volume</span><b>' + compact(o.volume) + '</b></div><div class="stat"><span>Smart Score</span><b>' + sc + "/100</b></div></div>" : "") +
      '<p class="xs muted" style="margin-top:12px">Demo data for illustration. Not a recommendation to buy or sell.</p>' +
      '<div class="stack" style="margin-top:16px;--gap:10px"><button class="btn primary block" data-watch="' + o.sym + '">＋ Add to watchlist</button>' +
      (o.cls === "stock" ? '<a class="btn block" href="' + pageLink("championship") + '">Trade it in the Championship ($100K virtual)</a>' : "") +
      '<a class="btn amber block" href="' + pageLink("get-matched") + '">Get a free portfolio review from a vetted advisor →</a></div>';
    document.body.appendChild(sc_); document.body.appendChild(dr);
    requestAnimationFrame(function () { dr.classList.add("open"); chart($("canvas", dr), [{ data: o.hist, color: c >= 0 ? "--up" : "--down", fill: true }], { labels: o.hist.map(function (_, i) { return ""; }) }); });
    function close() { dr.classList.remove("open"); sc_.remove(); setTimeout(function () { dr.remove(); }, 250); }
    sc_.addEventListener("click", close); $("[data-close]", dr).addEventListener("click", close);
    $("[data-watch]", dr).addEventListener("click", function () { if (WL.indexOf(o.sym) < 0) WL.unshift(o.sym); store.set("sm_watch", WL); renderWatch(); toast(o.sym + " added to your watchlist"); });
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-sym]"); if (t && !e.target.closest("[data-rm]") && !e.target.closest("form")) openStock(t.dataset.sym);
  });

  /* ---------- search ---------- */
  $$("[data-action=search]").forEach(function (b) {
    b.addEventListener("click", function () {
      var m = modal('<h3>Search markets</h3><label class="sr-only" for="q-in">Search</label><input id="q-in" placeholder="Ticker or company — e.g. NVDA, gold, bitcoin" style="margin-top:12px" autocomplete="off" /><div class="q-res stack" style="--gap:4px;margin-top:10px"></div>');
      var inp = $("#q-in", m.el), res = $(".q-res", m.el);
      function run() { var q = inp.value.trim().toLowerCase(); var r = M.list.filter(function (o) { return !q || o.sym.toLowerCase().indexOf(q) === 0 || o.name.toLowerCase().indexOf(q) > -1; }).slice(0, 8); res.innerHTML = r.map(function (o) { var c = M.chg(o); return '<button class="tile" data-sym="' + o.sym + '" style="padding:10px 12px"><span class="t-ico">' + o.sym.slice(0, 4) + '</span><span style="flex:1">' + esc(o.name) + '<small>' + o.cls + '</small></span><span class="num ' + cls(c) + '">' + pct(c) + "</span></button>"; }).join(""); }
      inp.addEventListener("input", run); run();
      res.addEventListener("click", function () { m.close(); });
    });
  });

  /* ---------- screener ---------- */
  $$("[data-widget=screener]").forEach(function (el) {
    var sectors = []; M.list.forEach(function (o) { if (o.sector && sectors.indexOf(o.sector) < 0) sectors.push(o.sector); }); sectors.sort();
    var sortK = "score", sortD = -1;
    el.innerHTML = '<div class="panel" style="margin-bottom:16px"><div class="row between" style="margin-bottom:14px"><div class="seg presets" role="group" aria-label="Preset screens"><button aria-pressed="true" data-p="all">All stocks</button><button aria-pressed="false" data-p="div">Dividend payers</button><button aria-pressed="false" data-p="value">Value (P/E &lt; 20)</button><button aria-pressed="false" data-p="mega">Mega caps</button><button aria-pressed="false" data-p="lowvol">Low volatility</button><button aria-pressed="false" data-p="mom">Momentum today</button></div><span class="chip accent res-count"></span></div>' +
      '<div class="grid g4" style="--gap:14px"><div class="field"><label for="sc-sector">Sector</label><select id="sc-sector"><option value="">Any sector</option>' + sectors.map(function (s) { return "<option>" + s + "</option>"; }).join("") + '</select></div>' +
      '<div class="field"><label for="sc-cap">Market cap</label><select id="sc-cap"><option value="0">Any</option><option value="10">Large ($10B+)</option><option value="200">Mega ($200B+)</option><option value="1000">$1T+</option></select></div>' +
      '<div class="field"><label for="sc-pe">Max P/E: <span class="num pe-v">Any</span></label><input id="sc-pe" type="range" min="5" max="200" value="200" /></div>' +
      '<div class="field"><label for="sc-div">Min dividend yield: <span class="num div-v">0%</span></label><input id="sc-div" type="range" min="0" max="6" step="0.25" value="0" /></div></div></div>' +
      '<div class="panel" style="padding:0"><div class="table-wrap"><table><thead><tr><th class="sortable" data-k="sym">Symbol</th><th class="sortable" data-k="sector">Sector</th><th class="sortable r" data-k="price">Price</th><th class="sortable r" data-k="chg">Chg %</th><th class="sortable r" data-k="mcap">Mkt cap</th><th class="sortable r" data-k="pe">P/E</th><th class="sortable r" data-k="div">Yield</th><th class="sortable r" data-k="beta">Beta</th><th class="sortable r" data-k="score">Smart Score ▾</th></tr></thead><tbody></tbody></table></div></div>' +
      '<p class="xs muted" style="margin-top:10px">Sample dataset of ' + M.list.filter(function (o) { return o.cls === "stock"; }).length + ' large caps. Smart Score blends value, income, stability, momentum and size — an educational composite, not advice.</p>';
    var sel = { sector: $("#sc-sector", el), cap: $("#sc-cap", el), pe: $("#sc-pe", el), div: $("#sc-div", el) };
    function draw() {
      var pe = +sel.pe.value, dv = +sel.div.value;
      $(".pe-v", el).textContent = pe >= 200 ? "Any" : pe; $(".div-v", el).textContent = dv + "%";
      var rows = M.list.filter(function (o) { return o.cls === "stock" && (!sel.sector.value || o.sector === sel.sector.value) && o.mcap >= +sel.cap.value && (pe >= 200 || (o.pe > 0 && o.pe <= pe)) && o.div >= dv && (!el._mom || M.chg(o) > 0) && (!el._lowvol || o.beta < 0.9); });
      rows.forEach(function (o) { o.score = smartScore(o); o.chgv = M.chg(o); });
      rows.sort(function (a, b) { var k = sortK === "chg" ? "chgv" : sortK; var x = a[k], y = b[k]; return (typeof x === "string" ? x.localeCompare(y) : x - y) * sortD; });
      $(".res-count", el).textContent = rows.length + " matches";
      $("tbody", el).innerHTML = rows.map(function (o) { return '<tr class="click" data-sym="' + o.sym + '"><td><span class="sym">' + o.sym + '</span><span class="sym-name">' + esc(o.name) + "</span></td><td>" + o.sector + '</td><td class="r num">' + fmt(o.price, 2) + '</td><td class="r num ' + cls(o.chgv) + '">' + pct(o.chgv) + '</td><td class="r num">$' + fmt(o.mcap, 0) + 'B</td><td class="r num">' + (o.pe ? o.pe.toFixed(1) : "n/m") + '</td><td class="r num">' + o.div.toFixed(2) + '%</td><td class="r num">' + o.beta.toFixed(2) + '</td><td class="r"><span class="chip ' + (o.score >= 60 ? "up" : o.score >= 45 ? "amber" : "down") + '">' + o.score + "</span></td></tr>"; }).join("") || '<tr><td colspan="9" class="muted">No stocks match. Loosen a filter.</td></tr>';
    }
    Object.keys(sel).forEach(function (k) { sel[k].addEventListener("input", draw); });
    $$("th.sortable", el).forEach(function (th) { th.addEventListener("click", function () { var k = th.dataset.k; if (sortK === k) sortD *= -1; else { sortK = k; sortD = (k === "sym" || k === "sector") ? 1 : -1; } $$("th.sortable", el).forEach(function (t) { t.textContent = t.textContent.replace(/ [▾▴]$/, ""); }); th.textContent += sortD < 0 ? " ▾" : " ▴"; draw(); }); });
    $(".presets", el).addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; $$("button", b.parentNode).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      sel.sector.value = ""; sel.cap.value = "0"; sel.pe.value = 200; sel.div.value = 0; el._mom = false; el._lowvol = false; sortK = "score"; sortD = -1;
      var p = b.dataset.p; if (p === "div") { sel.div.value = 2; sortK = "div"; } if (p === "value") sel.pe.value = 20; if (p === "mega") sel.cap.value = "200"; if (p === "lowvol") el._lowvol = true; if (p === "mom") { el._mom = true; sortK = "chg"; }
      draw();
    });
    draw(); setInterval(function () { if (!document.hidden) draw(); }, 9000);
  });

  /* ======================================================================
     CALCULATORS
     ====================================================================== */
  var CALCS = {
    compound: {
      title: "Compound interest", inputs: [["initial", "Starting amount ($)", 10000], ["monthly", "Monthly contribution ($)", 500], ["rate", "Annual return (%)", 7], ["years", "Years", 25]],
      run: function (v) {
        var bal = v.initial, contrib = v.initial, cs = [], gs = [], lb = [], r = v.rate / 100 / 12;
        for (var y = 0; y <= v.years; y++) { if (y > 0) for (var m = 0; m < 12; m++) { bal = bal * (1 + r) + v.monthly; contrib += v.monthly; } cs.push(contrib); gs.push(Math.max(0, bal - contrib)); lb.push("Y" + y); }
        return { stats: [["Future value", money(bal)], ["You contribute", money(contrib)], ["Growth earned", money(bal - contrib)]], series: [{ data: cs, color: "--ink-3", fill: true, label: "Contributions" }, { data: gs, color: "--accent", fill: true, label: "Growth" }], opts: { labels: lb, money: true, stacked: true } };
      }
    },
    retirement: {
      title: "Retirement / FIRE", inputs: [["age", "Current age", 32], ["retire", "Retirement age", 60], ["saved", "Saved so far ($)", 60000], ["monthly", "Monthly saving ($)", 1200], ["rate", "Annual return (%)", 6.5], ["spend", "Yearly spending in retirement ($)", 60000], ["wr", "Safe withdrawal rate (%)", 4]],
      run: function (v) {
        var target = v.spend / (v.wr / 100), bal = v.saved, s = [], t = [], lb = [], r = v.rate / 100 / 12, yrs = Math.max(1, v.retire - v.age);
        for (var y = 0; y <= yrs; y++) { if (y > 0) for (var m = 0; m < 12; m++) bal = bal * (1 + r) + v.monthly; s.push(bal); t.push(target); lb.push(v.age + y); }
        var fv = v.saved * Math.pow(1 + r, yrs * 12), need = r ? (target - fv) * r / (Math.pow(1 + r, yrs * 12) - 1) : (target - fv) / (yrs * 12);
        return { stats: [["Target nest egg", money(target)], ["Projected at " + v.retire, money(bal)], [bal >= target ? "On track — surplus" : "Monthly needed", bal >= target ? money(bal - target) : money(Math.max(0, need))]], series: [{ data: s, color: "--accent", fill: true, label: "Projected" }, { data: t, color: "--amber", label: "Target" }], opts: { labels: lb, money: true } };
      }
    },
    mortgage: {
      title: "Mortgage", inputs: [["price", "Home price ($)", 650000], ["down", "Down payment (%)", 20], ["rate", "Interest rate (%)", 5.25], ["years", "Amortization (years)", 25]],
      run: function (v) {
        var P = v.price * (1 - v.down / 100), r = v.rate / 100 / 12, n = v.years * 12, pmt = r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n, bal = P, bs = [], is = [], lb = [], ti = 0;
        for (var y = 0; y <= v.years; y++) { if (y > 0) for (var m = 0; m < 12; m++) { var i = bal * r; ti += i; bal = Math.max(0, bal - (pmt - i)); } bs.push(bal); is.push(ti); lb.push("Y" + y); }
        return { stats: [["Monthly payment", money(pmt, 2)], ["Loan amount", money(P)], ["Total interest", money(ti)]], series: [{ data: bs, color: "--accent", fill: true, label: "Balance" }, { data: is, color: "--down", label: "Interest paid" }], opts: { labels: lb, money: true } };
      }
    },
    loan: {
      title: "Loan / EMI", inputs: [["amount", "Loan amount", 25000], ["rate", "Interest rate (%)", 8.9], ["months", "Term (months)", 60]],
      run: function (v) {
        var r = v.rate / 100 / 12, n = v.months, pmt = r ? v.amount * r / (1 - Math.pow(1 + r, -n)) : v.amount / n, bal = v.amount, ps = [], is = [], lb = [];
        for (var m = 1; m <= n; m++) { var i = bal * r; bal -= pmt - i; if (m % Math.max(1, Math.round(n / 24)) === 0 || m === n) { ps.push(pmt - i); is.push(i); lb.push("M" + m); } }
        return { stats: [["Monthly EMI", money(pmt, 2)], ["Total interest", money(pmt * n - v.amount)], ["Total paid", money(pmt * n)]], series: [{ data: ps, color: "--accent", label: "Principal" }, { data: is, color: "--down", label: "Interest" }], opts: { labels: lb, money: true, bars: true, stacked: true } };
      }
    },
    dividend: {
      title: "Dividend income", inputs: [["invest", "Amount invested ($)", 100000], ["yield", "Dividend yield (%)", 3.5], ["growth", "Dividend growth / yr (%)", 6], ["years", "Years", 20], ["drip", "Reinvest dividends? (1 = yes, 0 = no)", 1]],
      run: function (v) {
        var cap = v.invest, y0 = v.yield / 100, inc = [], lb = [], tot = 0, last = 0;
        for (var y = 1; y <= v.years; y++) { var d = cap * y0 * Math.pow(1 + v.growth / 100, y - 1); tot += d; last = d; if (v.drip >= 1) cap += d; inc.push(d); lb.push("Y" + y); }
        return { stats: [["Year-1 income", money(inc[0] || 0)], ["Year-" + v.years + " income", money(last)], ["Monthly at the end", money(last / 12)]], series: [{ data: inc, color: "--up", label: "Annual dividends" }], opts: { labels: lb, money: true, bars: true } };
      }
    },
    position: {
      title: "Position size / risk", inputs: [["account", "Account size ($)", 50000], ["risk", "Risk per trade (%)", 1], ["entry", "Entry price ($)", 120], ["stop", "Stop-loss price ($)", 112], ["target", "Target price ($)", 140]],
      run: function (v) {
        var riskAmt = v.account * v.risk / 100, per = Math.abs(v.entry - v.stop) || 1, sh = Math.floor(riskAmt / per), rr = Math.abs(v.target - v.entry) / per;
        return { stats: [["Shares to buy", fmt(sh, 0)], ["Position value", money(sh * v.entry)], ["Reward : risk", rr.toFixed(2) + " : 1"]], series: [{ data: [riskAmt, sh * Math.abs(v.target - v.entry)], color: "--accent" }], opts: { labels: ["Max loss", "Target gain"], money: true, bars: true } };
      }
    },
    inflation: {
      title: "Inflation", inputs: [["amount", "Amount today ($)", 1000], ["rate", "Inflation (%/yr)", 3], ["years", "Years", 20]],
      run: function (v) {
        var cost = [], power = [], lb = [];
        for (var y = 0; y <= v.years; y++) { cost.push(v.amount * Math.pow(1 + v.rate / 100, y)); power.push(v.amount / Math.pow(1 + v.rate / 100, y)); lb.push("Y" + y); }
        return { stats: [["Same basket costs", money(cost[v.years])], ["Your cash buys", money(power[v.years])], ["Purchasing power lost", ((1 - power[v.years] / v.amount) * 100).toFixed(1) + "%"]], series: [{ data: cost, color: "--down", label: "Future cost" }, { data: power, color: "--accent", fill: true, label: "Real value of cash" }], opts: { labels: lb, money: true } };
      }
    }
  };
  var calcDrawers = [];
  $$("[data-widget=calc]").forEach(function (el) {
    var keys = (el.dataset.calcs || Object.keys(CALCS).join(",")).split(",");
    var start = keys[0]; var sub = SPA ? (location.hash.split("/")[2] || "") : location.hash.slice(1); if (keys.indexOf(sub) > -1) start = sub;
    if (keys.length > 1) el.appendChild(h("div", { class: "tabs", role: "tablist" }, keys.map(function (k) { return '<button class="tab" role="tab" data-k="' + k + '" aria-selected="' + (k === start) + '">' + CALCS[k].title + "</button>"; }).join("")));
    var body = h("div", { class: "calc" }); el.appendChild(body);
    var cur;
    function build(k) {
      cur = k; var c = CALCS[k], id = el.id || "c";
      body.innerHTML = '<form class="stack" style="--gap:14px" onsubmit="return false">' + c.inputs.map(function (i) { return '<div class="field"><label for="' + id + "-" + i[0] + '">' + i[1] + '</label><input id="' + id + "-" + i[0] + '" name="' + i[0] + '" type="number" step="any" value="' + i[2] + '" inputmode="decimal" /></div>'; }).join("") +
        '<p class="xs muted">Estimates for education only. Real returns vary and are not guaranteed.</p></form><div class="stack" style="--gap:16px"><div class="calc-out"></div><div class="legend"></div><canvas class="chart" role="img" aria-label="' + c.title + ' chart"></canvas><a class="btn amber" href="' + pageLink("get-matched") + '">Want a pro to check these numbers? Get matched free →</a></div>';
      $$("input", body).forEach(function (i) { i.addEventListener("input", calc); });
      calc();
    }
    function calc() {
      var v = {}; $$("input", body).forEach(function (i) { v[i.name] = parseFloat(i.value) || 0; });
      var out = CALCS[cur].run(v);
      $(".calc-out", body).innerHTML = out.stats.map(function (s) { return '<div class="stat"><span>' + s[0] + "</span><b>" + s[1] + "</b></div>"; }).join("");
      $(".legend", body).innerHTML = out.series.filter(function (s) { return s.label; }).map(function (s) { return '<span><i style="background:var(' + s.color + ')"></i>' + s.label + "</span>"; }).join("");
      chart($("canvas", body), out.series, out.opts);
    }
    el.addEventListener("click", function (e) { var t = e.target.closest(".tab"); if (!t) return; $$(".tab", el).forEach(function (x) { x.setAttribute("aria-selected", x === t); }); build(t.dataset.k); });
    build(start); calcDrawers.push(calc);
  });
  var rT; window.addEventListener("resize", function () { clearTimeout(rT); rT = setTimeout(redrawAll, 200); });
  document.addEventListener("sm:redraw", redrawAll);
  function redrawAll() { calcDrawers.forEach(function (f) { f(); }); renderIndices(); renderSentiment(); }

  /* ======================================================================
     FORMS — one submit pipeline for every lead type
     ====================================================================== */
  function submitForm(type, data) {
    data._type = type; data._page = location.pathname + location.hash; data._ts = new Date().toISOString();
    var u = store.get("sm_utm", null); if (u) data._utm = u;
    var log = store.get("sm_submissions", []); log.push(data); store.set("sm_submissions", log.slice(-50));
    if (window.gtag) try { window.gtag("event", "generate_lead", { form_type: type }); } catch (e) {}
    var ep = (C.endpoints || {})[type] || (C.endpoints || {}).default;
    if (C.netlifyForms && !ep) {
      var body = new URLSearchParams(); body.append("form-name", type); Object.keys(data).forEach(function (k) { body.append(k, typeof data[k] === "object" ? JSON.stringify(data[k]) : data[k]); });
      return fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() }).then(function (r) { if (!r.ok) throw 0; });
    }
    if (!ep) return new Promise(function (res) { setTimeout(res, 450); });
    return fetch(ep, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) }).then(function (r) { if (!r.ok) throw new Error(r.status); });
  }
  function validate(form) {
    var ok = true;
    $$(".err", form).forEach(function (e) { e.remove(); });
    $$("[required]", form).forEach(function (f) {
      f.classList.remove("invalid");
      var bad = f.type === "checkbox" ? !f.checked : !f.value.trim() || (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value)) || (f.type === "tel" && f.value.replace(/\D/g, "").length < 7);
      if (bad) { ok = false; f.classList.add("invalid"); var m = h("div", { class: "err" }, f.type === "email" ? "Enter a valid email address." : f.type === "tel" ? "Enter a valid phone number." : f.type === "checkbox" ? "Please tick this box to continue." : "This field is required."); (f.type === "checkbox" ? f.closest("label") : f).insertAdjacentElement("afterend", m); }
    });
    if (!ok) { var first = $(".invalid", form); first && first.focus(); }
    return ok;
  }
  function serialize(form) { var d = {}; new FormData(form).forEach(function (v, k) { d[k] = d[k] ? d[k] + ", " + v : v; }); return d; }
  $$("form[data-form]").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (e) {
      e.preventDefault(); if (form.querySelector("[name=company_website]") && form.querySelector("[name=company_website]").value) return; // honeypot
      if (!validate(form)) return;
      var btn = $("button[type=submit],button:not([type])", form), txt = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.innerHTML = "Sending…"; }
      var type = form.dataset.form, data = serialize(form); delete data.company_website;
      submitForm(type, data).then(function () {
        var succ = form.dataset.success || "Thanks — we received it.";
        if (type === "newsletter") { store.set("sm_subscribed", data.email || true); document.dispatchEvent(new CustomEvent("sm:subscribed")); }
        if (type === "contest") { document.dispatchEvent(new CustomEvent("sm:contest-join", { detail: data })); }
        if (form.dataset.replace !== "no") { var box = h("div", { class: "panel", role: "status" }, '<h3>✓ ' + esc(succ.split("|")[0]) + '</h3><p class="muted small" style="margin-top:6px">' + esc(succ.split("|")[1] || "") + "</p>"); form.replaceWith(box); }
        else { toast(succ.split("|")[0]); form.reset(); if (btn) { btn.disabled = false; btn.innerHTML = txt; } }
      }).catch(function () { toast("That didn't go through. Check your connection and try again."); if (btn) { btn.disabled = false; btn.innerHTML = txt; } });
    });
  });

  /* ---------- lead funnel (Get Matched) ---------- */
  $$("[data-widget=funnel]").forEach(function (el) {
    var steps = $$(".step", el), bar = $(".progress i", el), lab = $(".step-lab", el), i = 0;
    var ans = store.get("sm_lead_draft", {});
    function show(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      steps.forEach(function (s, k) { s.classList.toggle("active", k === i); });
      var total = steps.length - 1; bar.style.width = (Math.min(i, total) / total * 100) + "%";
      if (lab) lab.textContent = i < total ? "Step " + (i + 1) + " of " + total : "Your matches";
      $(".f-back", el).hidden = i === 0 || i === total; $(".f-nav", el).hidden = i === total;
      var nx = $(".f-next", el); var st = steps[i]; nx.textContent = st.dataset.cta || "Continue"; nx.hidden = st.dataset.auto === "1";
      $$("[aria-pressed]", st).forEach(function (t) { t.setAttribute("aria-pressed", ans[t.dataset.name] === t.dataset.value); });
      $$("input,select", st).forEach(function (f) { if (ans[f.name] != null && f.type !== "checkbox") f.value = ans[f.name]; });
      if (n > 0) { var top = el.getBoundingClientRect().top + scrollY - 90; if (scrollY > top) scrollTo({ top: top }); }
    }
    function save() { store.set("sm_lead_draft", ans); }
    el.addEventListener("click", function (e) {
      var t = e.target.closest(".tile"); if (t && t.dataset.name) { ans[t.dataset.name] = t.dataset.value; save(); $$(".tile", steps[i]).forEach(function (x) { x.setAttribute("aria-pressed", x === t); }); if (steps[i].dataset.auto === "1") setTimeout(function () { show(i + 1); }, 180); }
    });
    $$("input,select", el).forEach(function (f) { f.addEventListener("input", function () { if (f.type !== "checkbox") { ans[f.name] = f.value; save(); } if (f.name === "zip") { var z = $(".zip-note", el); if (z) z.hidden = f.value.trim().length < 3; } }); });
    $(".f-back", el).addEventListener("click", function () { show(i - 1); });
    $(".f-next", el).addEventListener("click", function () {
      var st = steps[i];
      if (st.dataset.auto === "1" || $(".tiles", st)) { var nm = $(".tile", st) && $(".tile", st).dataset.name; if (nm && !ans[nm]) { toast("Choose an option to continue."); return; } }
      if (!validate(st)) return;
      if (st.dataset.final === "1") {
        var btn = $(".f-next", el); btn.disabled = true; btn.textContent = "Finding your matches…";
        $$("input,select", st).forEach(function (f) { ans[f.name] = f.type === "checkbox" ? f.checked : f.value; });
        submitForm("lead", Object.assign({}, ans)).then(function () {
          try { localStorage.removeItem("sm_lead_draft"); } catch (e) {}
          renderMatches(); btn.disabled = false; show(steps.length - 1);
        }).catch(function () { btn.disabled = false; btn.textContent = st.dataset.cta; toast("We couldn't submit. Please try again."); });
        return;
      }
      show(i + 1);
    });
    function renderMatches() {
      var box = $(".matches", el); if (!box) return;
      var nm = (ans.first_name || "there"); $(".m-name", el) && ($(".m-name", el).textContent = nm);
      var kinds = { invest: "Wealth Advisor, CFP®", retire: "Retirement Planner, CFP®", home: "Mortgage Specialist", tax: "Tax Strategist, CPA", business: "Business Finance Advisor", insure: "Licensed Insurance Advisor" };
      var names = [["Priya", "Anand"], ["Marc", "Tremblay"], ["Dana", "Whitfield"]], r = seeded((ans.zip || "x").length * 97 + daySeed);
      box.innerHTML = names.map(function (n, k) {
        return '<div class="panel match-card"><div class="avatar">' + n[0][0] + n[1][0] + '</div><div><h4>' + n[0] + " " + n[1][0] + '. <span class="chip up" style="margin-left:6px">Fiduciary</span></h4><p class="small muted">' + (kinds[ans.goal] || kinds.invest) + " · " + (8 + Math.floor(r() * 20)) + " yrs experience · ★ " + (4.6 + r() * 0.4).toFixed(1) + '</p><p class="xs muted">Serves ' + esc(ans.zip || "your area") + " · " + (ans.meet === "virtual" ? "Virtual" : "In person or virtual") + '</p></div><button class="btn primary sm" type="button" data-book="' + n[0] + '">Book free intro call</button></div>';
      }).join("") + '<p class="xs muted">Example profiles shown for demonstration. Live matches come from our vetted partner network.</p>';
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-book]"); if (b) { b.textContent = "✓ Request sent"; b.disabled = true; toast(b.dataset.book + " will reach out within 1 business day."); } });
    show(0);
  });

  /* ---------- newsletter referral hub ---------- */
  function refId() { var id = store.get("sm_ref", null); if (!id) { id = Math.random().toString(36).slice(2, 8); store.set("sm_ref", id); } return id; }
  function renderReferral() {
    $$("[data-widget=referral]").forEach(function (el) {
      var link = (C.siteUrl || location.origin) + "/?ref=" + refId(), count = store.get("sm_ref_count", 0);
      var ms = [[1, "Smart Investor Checklist (PDF)"], [3, "Championship Insider badge"], [5, "1 month of Smart.Market Pro"], [10, "Smart.Market hoodie"], [25, "1:1 portfolio review call"]];
      el.innerHTML = '<div class="inline-form"><label class="sr-only" for="ref-link">Your referral link</label><input id="ref-link" readonly value="' + link + '" class="mono" /><button class="btn primary" type="button" data-copy>Copy link</button></div>' +
        '<div class="referral" style="margin-top:14px">' + ms.slice(0, 4).map(function (m) { return '<div class="ref-step' + (count >= m[0] ? " done" : "") + '"><b>' + m[0] + "</b>" + (m[0] === 1 ? "referral" : "referrals") + '<div class="xs muted" style="margin-top:4px">' + m[1] + "</div></div>"; }).join("") + "</div>" +
        '<div class="row" style="margin-top:12px"><a class="btn sm" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent("I read Smart Open every morning — free, 5-minute market brief: " + link) + '">Share on X</a><a class="btn sm" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(link) + '">LinkedIn</a><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent("Free 5-minute market brief I read daily: " + link) + '">WhatsApp</a><a class="btn sm" href="mailto:?subject=' + encodeURIComponent("You'd like this market newsletter") + "&body=" + encodeURIComponent("Free 5-min daily brief: " + link) + '">Email</a></div>';
      $("[data-copy]", el).addEventListener("click", function () { var i = $("#ref-link", el); i.select(); try { navigator.clipboard.writeText(i.value).then(function () { toast("Link copied"); }, function () { document.execCommand("copy"); toast("Link copied"); }); } catch (e) { document.execCommand("copy"); toast("Link copied"); } });
    });
  }
  renderReferral();

  /* ======================================================================
     CHAMPIONSHIP — paper-trading contest
     ====================================================================== */
  $$("[data-widget=countdown]").forEach(function (el) {
    var end = new Date((C.contest || {}).endsAt || Date.now() + 864e6).getTime();
    function tick() { var s = Math.max(0, (end - Date.now()) / 1000), d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = Math.floor(s % 60); el.innerHTML = [[d, "Days"], [hh, "Hrs"], [m, "Min"], [ss, "Sec"]].map(function (x) { return "<div><b>" + String(x[0]).padStart(2, "0") + "</b><span>" + x[1] + "</span></div>"; }).join(""); }
    tick(); setInterval(tick, 1000);
  });
  $$("[data-widget=contest]").forEach(function (el) {
    var START = (C.contest || {}).startCash || 100000;
    var S = store.get("sm_contest", null);
    var bots = ["BullishBeaver", "QuantQueen", "DivDaddy", "ThetaGang_TO", "ValueVik", "MomentumMo", "IndexIvy", "MapleMarkets", "SatoshiSam", "FiduciaryFay", "LongOnlyLeo", "HedgeHannah"];
    var br = seeded(daySeed + 7), botRet = bots.map(function () { return (br() - 0.35) * 18; });
    function value() { if (!S) return START; var v = S.cash; Object.keys(S.pos).forEach(function (k) { v += S.pos[k] * M.all[k].price; }); return v; }
    function render() {
      var game = $(".game", el), reg = $(".reg", el);
      if (!S) { game.hidden = true; reg.hidden = false; }
      else {
        game.hidden = false; reg.hidden = true;
        var v = value(), ret = (v / START - 1) * 100;
        $(".g-val", el).textContent = money(v, 2); $(".g-cash", el).textContent = money(S.cash, 2);
        var gr = $(".g-ret", el); gr.textContent = pct(ret); gr.className = "chip " + cls(ret) + " g-ret";
        $(".g-hold", el).innerHTML = Object.keys(S.pos).length ? '<div class="table-wrap"><table><thead><tr><th>Symbol</th><th class="r">Shares</th><th class="r">Avg cost</th><th class="r">Price</th><th class="r">P/L</th></tr></thead><tbody>' + Object.keys(S.pos).map(function (k) { var o = M.all[k], pl = (o.price - S.cost[k]) * S.pos[k]; return '<tr><td class="sym">' + k + '</td><td class="r num">' + S.pos[k] + '</td><td class="r num">' + fmt(S.cost[k], 2) + '</td><td class="r num">' + fmt(o.price, 2) + '</td><td class="r num ' + cls(pl) + '">' + money(pl, 2) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted small">No positions yet. Place your first trade above — you have ' + money(S.cash) + " in virtual cash.</p>";
        var sel = $(".g-sym", el), o = M.all[sel.value]; if (o) $(".g-px", el).textContent = "Last " + fmt(o.price, 2);
      }
      var rows = bots.map(function (b, k) { return { n: b, r: botRet[k] + Math.sin(Date.now() / 6e4 + k) * 0.4 }; });
      if (S) rows.push({ n: S.name + " (you)", r: (value() / START - 1) * 100, me: 1 });
      rows.sort(function (a, b) { return b.r - a.r; });
      $(".lb", el).innerHTML = "<table><thead><tr><th>#</th><th>Player</th><th class=r>Return</th><th class=r>Value</th></tr></thead><tbody>" + rows.map(function (x, k) { return "<tr" + (x.me ? ' class="me-row"' : "") + '><td><span class="rank' + (k === 0 ? " r1" : "") + '">' + (k + 1) + "</span></td><td>" + esc(x.n) + '</td><td class="r num ' + cls(x.r) + '">' + pct(x.r) + '</td><td class="r num">' + money(START * (1 + x.r / 100)) + "</td></tr>"; }).join("") + "</tbody></table>";
    }
    var symSel = $(".g-sym", el);
    symSel.innerHTML = M.list.filter(function (o) { return o.cls === "stock" || o.cls === "crypto"; }).map(function (o) { return '<option value="' + o.sym + '">' + o.sym + " — " + esc(o.name) + "</option>"; }).join("");
    symSel.addEventListener("change", render);
    document.addEventListener("sm:contest-join", function (e) { S = { name: (e.detail.handle || e.detail.name || "You").slice(0, 20), cash: START, pos: {}, cost: {} }; store.set("sm_contest", S); render(); toast("You're in! $" + fmt(START, 0) + " virtual cash loaded."); });
    function trade(side) {
      var sym = symSel.value, q = parseInt($(".g-qty", el).value, 10), o = M.all[sym];
      if (!(q > 0)) { toast("Enter a share quantity."); return; }
      if (side === "buy") { var cost = q * o.price; if (cost > S.cash) { toast("Not enough cash. Max " + Math.floor(S.cash / o.price) + " shares."); return; } S.cost[sym] = ((S.cost[sym] || 0) * (S.pos[sym] || 0) + cost) / ((S.pos[sym] || 0) + q); S.pos[sym] = (S.pos[sym] || 0) + q; S.cash -= cost; }
      else { if (!S.pos[sym] || S.pos[sym] < q) { toast("You hold " + (S.pos[sym] || 0) + " " + sym + "."); return; } S.pos[sym] -= q; S.cash += q * o.price; if (!S.pos[sym]) { delete S.pos[sym]; delete S.cost[sym]; } }
      store.set("sm_contest", S); render(); toast((side === "buy" ? "Bought " : "Sold ") + q + " " + sym + " @ " + fmt(o.price, 2));
    }
    $(".g-buy", el).addEventListener("click", function () { trade("buy"); });
    $(".g-sell", el).addEventListener("click", function () { trade("sell"); });
    $(".g-reset", el).addEventListener("click", function () { if (confirm("Reset your portfolio to $" + fmt(START, 0) + "?")) { S.cash = START; S.pos = {}; S.cost = {}; store.set("sm_contest", S); render(); } });
    render(); M.on(function () { render(); });
  });

  /* ======================================================================
     LEARN
     ====================================================================== */
  $$("[data-widget=glossary]").forEach(function (el) {
    el.innerHTML = '<label class="sr-only" for="g-q">Search glossary</label><input id="g-q" placeholder="Search ' + D.glossary.length + ' terms — e.g. P/E, ETF, yield" /><dl class="gloss" style="margin-top:14px"></dl>';
    var dl = $("dl", el), q = $("#g-q", el);
    function draw() { var s = q.value.toLowerCase(); dl.innerHTML = D.glossary.filter(function (g) { return !s || (g[0] + g[1]).toLowerCase().indexOf(s) > -1; }).map(function (g) { return "<div><dt>" + esc(g[0]) + "</dt><dd>" + esc(g[1]) + "</dd></div>"; }).join("") || '<p class="muted">No terms found. <a href="' + pageLink("contact") + '">Suggest one</a>.</p>'; }
    q.addEventListener("input", draw); draw();
  });
  $$("[data-widget=tod]").forEach(function (el) { var g = D.glossary[daySeed % D.glossary.length]; el.innerHTML = '<span class="eyebrow">Term of the day</span><h3 style="margin-top:8px">' + esc(g[0]) + '</h3><p class="muted" style="margin-top:6px">' + esc(g[1]) + "</p>"; });
  $$("[data-widget=quiz]").forEach(function (el) {
    var k = 0, score = 0;
    function draw() {
      if (k >= D.quiz.length) { el.innerHTML = '<h3>You scored ' + score + "/" + D.quiz.length + '</h3><p class="muted" style="margin-top:6px">' + (score >= 4 ? "Sharp. You're ready for the Championship." : "Solid start — the Academy guides will close the gaps.") + '</p><div class="row" style="margin-top:14px"><a class="btn primary" href="' + pageLink("championship") + '">Join the Championship</a><button class="btn" data-again>Retake</button></div>'; $("[data-again]", el).addEventListener("click", function () { k = 0; score = 0; draw(); }); return; }
      var q = D.quiz[k];
      el.innerHTML = '<div class="row between"><span class="eyebrow">Question ' + (k + 1) + " of " + D.quiz.length + '</span><span class="chip">Score ' + score + '</span></div><h3 style="margin-top:10px">' + esc(q[0]) + "</h3>" + q[1].map(function (o, j) { return '<button class="quiz-opt" data-j="' + j + '">' + esc(o) + "</button>"; }).join("");
      $$(".quiz-opt", el).forEach(function (b) { b.addEventListener("click", function () { var j = +b.dataset.j; if (j === q[2]) score++; $$(".quiz-opt", el).forEach(function (x) { x.disabled = true; if (+x.dataset.j === q[2]) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); }); setTimeout(function () { k++; draw(); }, 900); }); });
    }
    draw();
  });
  $$("[data-widget=articles]").forEach(function (el) {
    var lim = +(el.dataset.limit || 99);
    el.innerHTML = D.articles.slice(0, lim).map(function (a) { return '<a class="article-card" href="' + pageLink("learn") + '"><div class="cover" style="background:linear-gradient(135deg,hsl(' + a[4] + ' 70% 38%),hsl(' + (a[4] + 40) + ' 65% 25%))">' + esc(a[0]) + '</div><div class="body"><h4>' + esc(a[1]) + '</h4><span class="meta">' + a[2] + " · " + a[3] + " min read</span></div></a>"; }).join("");
  });

  /* ---------- videos ---------- */
  $$("[data-widget=videos]").forEach(function (el) {
    var vids = C.videos || [], lim = +(el.dataset.limit || 99), filter = "All";
    var series = ["All"]; vids.forEach(function (v) { if (series.indexOf(v.series) < 0) series.push(v.series); });
    var grid = h("div", { class: "grid g3" });
    if (!el.dataset.limit) { var seg = h("div", { class: "seg", role: "group", "aria-label": "Series", style: "margin-bottom:18px" }, series.map(function (s, k) { return '<button aria-pressed="' + (k === 0) + '" data-s="' + esc(s) + '">' + esc(s) + "</button>"; }).join("")); el.appendChild(seg); seg.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; filter = b.dataset.s; $$("button", seg).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); draw(); }); }
    el.appendChild(grid);
    function draw() { grid.innerHTML = vids.filter(function (v) { return filter === "All" || v.series === filter; }).slice(0, lim).map(function (v) { var i = vids.indexOf(v); return '<button class="vid" data-v="' + i + '"><div class="thumb" style="background:linear-gradient(135deg,hsl(' + v.hue + ' 65% 32%),hsl(' + (v.hue + 50) + ' 60% 18%))"><span style="position:relative;z-index:1;max-width:70%">' + esc(v.series) + '</span><span class="dur">' + v.dur + '</span></div><h4>' + esc(v.title) + '</h4></button>'; }).join(""); }
    draw();
    grid.addEventListener("click", function (e) {
      var b = e.target.closest(".vid"); if (!b) return; var v = vids[+b.dataset.v];
      if (v.id) modal('<iframe class="video-frame" src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.id) + '?autoplay=1&rel=0" title="' + esc(v.title) + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>', true);
      else modal('<h3>' + esc(v.title) + '</h3><p class="muted" style="margin-top:8px">This episode slot is ready — add its YouTube video id in <code>config.js → videos</code> and it plays right here.</p><a class="btn primary" style="margin-top:16px" target="_blank" rel="noopener" href="' + (C.youtubeChannel || "#") + '">Visit the channel</a>');
    });
  });

  /* ======================================================================
     SUPPORT / DONATIONS
     ====================================================================== */
  $$("[data-widget=goal]").forEach(function (el) {
    var g = (C.donate || {}).goal || 25000, r = (C.donate || {}).raised || 0, p = Math.min(100, r / g * 100);
    el.innerHTML = '<div class="row between"><b class="num" style="font-size:1.3rem">' + money(r) + ' <span class="muted small" style="font-weight:400">raised of ' + money(g) + ' goal</span></b><span class="chip accent">' + p.toFixed(0) + '%</span></div><div class="goalbar" style="margin-top:10px" role="progressbar" aria-valuenow="' + p.toFixed(0) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p + '%"></i></div>';
  });
  $$("[data-widget=donate]").forEach(function (el) {
    var freq = "once", amt = 25, fund = "Where it's needed most";
    var oneAmts = [10, 25, 50, 100];
    el.innerHTML = '<div class="seg freq" role="group" aria-label="Frequency"><button aria-pressed="true" data-f="once">One-time</button><button aria-pressed="false" data-f="monthly">Monthly</button></div>' +
      '<div class="amounts" style="margin-top:14px">' + oneAmts.map(function (a) { return '<button class="amt" aria-pressed="' + (a === amt) + '" data-a="' + a + '">$' + a + "</button>"; }).join("") + '</div>' +
      '<div class="field" style="margin-top:10px"><label for="don-custom">Or enter an amount (USD)</label><input id="don-custom" type="number" min="1" placeholder="Other amount" /></div>' +
      '<div class="field" style="margin-top:12px"><label for="don-fund">Direct my support to</label><select id="don-fund"><option>Where it\'s needed most</option><option>Operations &amp; data costs</option><option>Championship prize pool</option><option>Marketing &amp; outreach</option><option>Hiring writers &amp; creators</option><option>Free financial-literacy programs</option></select></div>' +
      '<label class="check" style="margin-top:12px"><input type="checkbox" id="don-wall" checked /> Show my first name on the supporter wall</label>' +
      '<button class="btn primary lg block don-go" style="margin-top:14px"></button><p class="xs muted" style="margin-top:8px;text-align:center">Secure checkout by Stripe · Cancel monthly anytime · Receipts emailed instantly</p>' +
      '<div class="row" style="justify-content:center;margin-top:10px"><a class="btn sm alt-bmc" target="_blank" rel="noopener">Buy Me a Coffee</a><a class="btn sm alt-kofi" target="_blank" rel="noopener">Ko-fi</a><a class="btn sm alt-pp" target="_blank" rel="noopener">PayPal</a></div>';
    var d = C.donate || {};
    [["alt-bmc", d.buyMeACoffee], ["alt-kofi", d.kofi], ["alt-pp", d.paypal]].forEach(function (p) { var a = $("." + p[0], el); if (p[1]) a.href = p[1]; else a.hidden = true; });
    function label() { $(".don-go", el).textContent = "Give $" + amt + (freq === "monthly" ? " / month" : "") + " →"; }
    $(".freq", el).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; freq = b.dataset.f; $$(".freq button", el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); label(); });
    $(".amounts", el).addEventListener("click", function (e) { var b = e.target.closest(".amt"); if (!b) return; amt = +b.dataset.a; $("#don-custom", el).value = ""; $$(".amt", el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); label(); });
    $("#don-custom", el).addEventListener("input", function (e) { var v = Math.round(+e.target.value); if (v > 0) { amt = v; $$(".amt", el).forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); label(); } });
    $("#don-fund", el).addEventListener("change", function (e) { fund = e.target.value; });
    $(".don-go", el).addEventListener("click", function () {
      var link = freq === "monthly" ? (amt >= 50 ? d.monthly && d.monthly.patron : amt >= 15 ? d.monthly && d.monthly.insider : d.monthly && d.monthly.supporter) : (d.oneTime && (d.oneTime[amt] || d.oneTime.custom));
      store.set("sm_last_donation_intent", { amt: amt, freq: freq, fund: fund });
      if (window.gtag) try { gtag("event", "begin_checkout", { value: amt, currency: "USD" }); } catch (e) {}
      if (link) { location.href = link; return; }
      modal('<h3>Thank you for backing Smart.Market</h3><p class="muted" style="margin-top:8px">You chose <b>$' + amt + (freq === "monthly" ? "/month" : "") + "</b> toward <b>" + esc(fund) + '</b>.</p><p class="small muted" style="margin-top:10px">Checkout opens here once Stripe Payment Links are added in <code>config.js → donate</code>.</p>');
    });
    label();
  });
  $$("[data-widget=wall]").forEach(function (el) {
    var w = [["Amélie", 50, "Operations & data costs", "The screener alone saved me hours. Keep it free!"], ["Rohan", 25, "Championship prize pool", "Won nothing, learned everything."], ["Jess", 10, "Where it's needed most", ""], ["Tom", 100, "Hiring writers & creators", "Best retirement calculator I've found."], ["Kwame", 15, "Free financial-literacy programs", "For the students."], ["Lucía", 25, "Where it's needed most", "Morning brief is my coffee ritual."]];
    el.innerHTML = w.map(function (x) { return '<div class="wall-item"><div class="avatar" style="width:36px;height:36px;font-size:.85rem;flex-shrink:0">' + x[0][0] + '</div><div><b>' + esc(x[0]) + '</b> <span class="muted">gave $' + x[1] + " · " + esc(x[2]) + "</span>" + (x[3] ? '<div class="muted">“' + esc(x[3]) + "”</div>" : "") + "</div></div>"; }).join("");
  });

  /* ---------- broker comparison ---------- */
  $$("[data-widget=brokers]").forEach(function (el) {
    var B = D.brokers || [], aff = C.affiliates || {};
    el.innerHTML = B.map(function (b, i) {
      var stars = "★★★★★".slice(0, Math.round(b[2])) + "☆☆☆☆☆".slice(0, 5 - Math.round(b[2]));
      return '<article class="panel offer" style="margin-bottom:14px"><div class="stack" style="--gap:8px"><div class="logo-box">' + esc(b[0]) + '</div><div><span class="stars" aria-label="' + b[2] + ' out of 5">' + stars + '</span> <b class="num">' + b[2].toFixed(1) + '</b></div></div>' +
        '<div class="stack" style="--gap:10px"><div><span class="chip accent">' + esc(b[1]) + '</span></div><div class="kv"><div><span>Min deposit</span><b>' + b[3] + '</b></div><div><span>Stock trades</span><b>' + b[4] + '</b></div><div><span>Promo</span><b>' + esc(b[5]) + '</b></div><div><span>Highlights</span><b>' + esc(b[6].join(" · ")) + '</b></div></div><details class="pc"><summary>Pros &amp; cons</summary><ul>' + b[7].map(function (p) { return "<li>✓ " + esc(p) + "</li>"; }).join("") + b[8].map(function (p) { return "<li>✕ " + esc(p) + "</li>"; }).join("") + "</ul></details></div>" +
        '<div class="stack" style="--gap:6px"><a class="btn primary block" rel="sponsored noopener" target="_blank" href="' + (aff["broker" + (i + 1)] || "#") + '">Open account</a><span class="xs muted" style="text-align:center">on the provider\'s secure site</span></div></article>';
    }).join("");
  });

  /* ---------- careers ---------- */
  $$("[data-widget=jobs]").forEach(function (el) {
    el.innerHTML = D.jobs.map(function (j) { return '<div class="panel job"><div><h4>' + esc(j[0]) + '</h4><div class="row" style="--gap:6px;margin-top:8px"><span class="chip accent">' + j[1] + '</span><span class="chip">' + j[2] + '</span><span class="chip">' + j[3] + '</span></div></div><button class="btn sm" data-apply="' + esc(j[0]) + '">Apply</button></div>'; }).join("");
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-apply]"); if (!b) return; var s = $("#ap-role"); if (s) { s.value = b.dataset.apply; s.closest("form").scrollIntoView({ behavior: "smooth" }); setTimeout(function () { $("#ap-name") && $("#ap-name").focus(); }, 500); } });
  });
  $$("#ap-role").forEach(function (s) { s.innerHTML = D.jobs.map(function (j) { return "<option>" + esc(j[0]) + "</option>"; }).join("") + "<option>General application</option>"; });

  /* ======================================================================
     ADS, ANALYTICS, CONSENT, CONVERSION HOOKS
     ====================================================================== */
  function loadScript(src, attrs) { var s = document.createElement("script"); s.async = true; s.src = src; if (attrs) for (var k in attrs) s.setAttribute(k, attrs[k]); document.head.appendChild(s); }
  function initAds() {
    var ads = $$(".ad-slot");
    if (C.adsenseClient && !window._smAds) {
      window._smAds = 1; loadScript("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + C.adsenseClient, { crossorigin: "anonymous" });
      ads.forEach(function (a) { var slot = (C.adSlots || {})[a.dataset.ad]; a.classList.add("live"); a.innerHTML = '<ins class="adsbygoogle" style="display:block;width:100%" data-ad-client="' + C.adsenseClient + '"' + (slot ? ' data-ad-slot="' + slot + '"' : "") + ' data-ad-format="' + (a.dataset.ad === "infeed" ? "fluid" : "auto") + '" data-full-width-responsive="true"></ins>'; try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {} });
    } else ads.forEach(function (a) { if (!a.innerHTML.trim()) a.textContent = "Advertisement · " + a.dataset.ad; });
  }
  function initGA() { if (!C.gaId || window._smGA) return; window._smGA = 1; loadScript("https://www.googletagmanager.com/gtag/js?id=" + C.gaId); window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); }; gtag("js", new Date()); gtag("config", C.gaId); }
  (function consent() {
    var c = store.get("sm_consent", null);
    if (c === "all") { initGA(); initAds(); return; }
    initAds(); // placeholders only (no scripts) until consent
    if (c) return;
    var b = h("div", { class: "cookie", role: "dialog", "aria-label": "Cookie consent" }, '<p><b>Cookies & ads.</b> We use cookies to measure traffic and show ads that keep Smart.Market free. <a href="' + pageLink("privacy") + '">Privacy policy</a>.</p><div class="row" style="margin-top:12px"><button class="btn primary sm" data-c="all">Accept all</button><button class="btn sm" data-c="essential">Essential only</button></div>');
    document.body.appendChild(b);
    b.addEventListener("click", function (e) { var x = e.target.closest("[data-c]"); if (!x) return; store.set("sm_consent", x.dataset.c); b.remove(); if (x.dataset.c === "all") { initGA(); initAds(); } });
  })();

  // sticky CTA after 45% scroll
  (function sticky() {
    var bar = $(".sticky-cta"); if (!bar) return;
    if (sess.get("sm_sticky_x")) { bar.remove(); return; }
    window.addEventListener("scroll", function () { var cur = document.body.dataset.page; var p = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight); bar.classList.toggle("show", p > 0.45 && cur !== "get-matched" && !$(".cookie")); }, { passive: true });
    $("[data-x]", bar).addEventListener("click", function () { bar.remove(); sess.set("sm_sticky_x", "1"); });
  })();

  // exit-intent lead magnet (desktop, once per session, not on funnel)
  (function exitIntent() {
    if (matchMedia("(hover: none)").matches) return;
    document.addEventListener("mouseout", function f(e) {
      if (e.clientY > 8 || e.relatedTarget || sess.get("sm_exit") || document.body.dataset.page === "get-matched" || store.get("sm_subscribed", false) || $(".modal")) return;
      sess.set("sm_exit", "1"); document.removeEventListener("mouseout", f);
      var m = modal('<span class="eyebrow">Free download</span><h2 style="margin-top:8px">The 2026 Smart Investor Playbook</h2><p class="muted" style="margin-top:10px">32 pages: the 7-account setup, fee audit checklist, and the exact index portfolios for every age. Plus the 5-minute Smart Open brief each weekday.</p><form data-form="newsletter" data-success="Check your inbox|Your Playbook is on its way." class="stack" style="--gap:10px;margin-top:16px"><input type="hidden" name="source" value="exit-intent" /><label class="sr-only" for="ex-email">Email</label><input id="ex-email" name="email" type="email" required placeholder="you@email.com" /><button class="btn primary block" type="submit">Send me the Playbook</button><p class="xs muted">No spam. Unsubscribe in one click.</p></form>');
      bindForms(m.el);
    });
  })();
  function bindForms(root) {
    $$("form[data-form]", root).forEach(function (form) {
      form.setAttribute("novalidate", "");
      form.addEventListener("submit", function (e) { e.preventDefault(); if (!validate(form)) return; submitForm(form.dataset.form, serialize(form)).then(function () { store.set("sm_subscribed", true); form.innerHTML = '<h3>✓ ' + esc((form.dataset.success || "Done").split("|")[0]) + '</h3><p class="muted small">' + esc((form.dataset.success || "|").split("|")[1]) + "</p>"; }); });
    });
  }

  // TradingView widgets (deployed domain only)
  if (C.tradingViewWidgets) $$("[data-tv]").forEach(function (el) {
    var cfg = { "market-overview": { colorTheme: "light", dateRange: "1D", showChart: true, width: "100%", height: 460, tabs: [{ title: "Indices", symbols: [{ s: "FOREXCOM:SPXUSD" }, { s: "FOREXCOM:NSXUSD" }, { s: "FOREXCOM:DJI" }] }] }, "stock-heatmap": { dataSource: "SPX500", blockSize: "market_cap_basic", blockColor: "change", width: "100%", height: 500 } }[el.dataset.tv];
    if (!cfg) return; el.innerHTML = ""; var s = document.createElement("script"); s.src = "https://s3.tradingview.com/external-embedding/embed-widget-" + el.dataset.tv + ".js"; s.async = true; s.innerHTML = JSON.stringify(cfg); el.appendChild(s);
  });

  /* ======================================================================
     SPA ROUTER (single-file preview build only)
     ====================================================================== */
  if (SPA) {
    var titles = window.SM_TITLES || {};
    function route() {
      var parts = (location.hash || "#/index").replace(/^#\/?/, "").split("/"), page = parts[0] || "index";
      var target = $('main[data-route="' + page + '"]'); if (!target) { page = "index"; target = $('main[data-route="index"]'); }
      $$("main[data-route]").forEach(function (m) { m.hidden = m !== target; });
      document.body.dataset.page = page; markNav(page);
      document.title = titles[page] || "Smart.Market";
      if (parts[1]) { var tb = $('.tab[data-k="' + parts[1] + '"]', target); if (tb) tb.click(); var anchor = target.querySelector("#" + CSS.escape(parts[1])); if (anchor && !tb) { setTimeout(function () { anchor.scrollIntoView(); }, 30); return; } }
      scrollTo(0, 0);
      requestAnimationFrame(redrawAll); renderHeat();
    }
    window.addEventListener("hashchange", route); route();
  } else markNav(document.body.dataset.page);
})();
