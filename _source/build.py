#!/usr/bin/env python3
"""Smart.Market static site builder.

    python3 _source/build.py

Reads   _source/src/partials/*.html   (page bodies)
        assets/*  (repo root; css / js / config, served as-is)
        _source/content/articles/*.md (Academy guides, Markdown + front matter)
        data/*.json                   (live data snapshots written by the daily automation)
Writes  the finished site to the repository root, which GitHub Pages serves as-is.
"""
import datetime, glob, html, json, os, re, shutil

import markdown

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC_DIR)
SRC = os.path.join(SRC_DIR, "src")
ARTICLES = os.path.join(SRC_DIR, "content", "articles")
DATA = os.path.join(ROOT, "data")
MANIFEST = os.path.join(SRC_DIR, ".generated.json")

SITE = "https://smart.market"
NAME = "Smart.Market"
ADSENSE = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6620975821265271" crossorigin="anonymous"></script>'
PARTNER_LINK = "https://web.works/contact"
NOW = datetime.datetime.now(datetime.timezone.utc)
TODAY = NOW.date().isoformat()
ASSET_V = NOW.strftime("%Y%m%d%H%M")

# slug: (title, description, sitemap priority, changefreq)
PAGES = {
    "index": ("Smart.Market | Live Markets, Daily Brief, Free Money Tools & Advisor Requests",
              "Live market data, an automatic daily market brief, a stock screener, 8 free money calculators, a monthly $100K investing championship and free advisor requests.", "1.0", "daily"),
    "markets": ("Markets Today: Live Indices, Stocks, Crypto, FX, Heatmap & Calendar | Smart.Market",
                "Live S&P 500, Nasdaq, Dow, TSX, crypto, gold, oil, currencies and bond yields, with a stock heatmap, top movers, and economic and earnings calendars.", "0.9", "hourly"),
    "brief": ("Today's Market Brief: What Moved and Why | Smart.Market",
              "An automatic, data-driven daily market brief: index moves, sector leaders and laggards, rates, commodities, crypto and what to watch next.", "0.9", "daily"),
    "news": ("Market News: Live Headlines from Trusted Sources | Smart.Market",
             "Live business and market headlines from central banks, regulators and major financial publishers, updated automatically throughout the day.", "0.8", "hourly"),
    "screener": ("Free Stock Screener with Smart Score | Smart.Market",
                 "Screen large-cap stocks by sector, valuation, dividend yield and volatility, with presets, a 0-100 Smart Score and a live full-market screener.", "0.9", "daily"),
    "tools": ("Free Financial Calculators: Compound Interest, Retirement, Mortgage, FX & More | Smart.Market",
              "Compound interest, retirement/FIRE, mortgage, loan EMI, dividend income, position size, inflation and live currency converter, with charts.", "0.9", "weekly"),
    "compare": ("How to Choose a Broker: Interactive Matcher & Checklist | Smart.Market",
                "Find the type of investing account that fits you with an interactive matcher, a 7-point checklist and plain-English answers on fees and protection.", "0.7", "monthly"),
    "learn": ("Smart Academy: Free Investing & Personal Finance Guides | Smart.Market",
              "Plain-English, fact-checked guides on investing, retirement accounts, taxes, advisors and markets, plus a glossary and a quick quiz.", "0.9", "weekly"),
    "glossary": ("Investing Glossary: 60 Terms Explained Simply | Smart.Market",
                 "Clear definitions of the investing and personal-finance terms you'll meet most often, from asset allocation to yield curve.", "0.6", "monthly"),
    "playbook": ("The Smart Investor Playbook (Free Guide) | Smart.Market",
                 "A free, practical playbook: set up the right accounts, audit your fees, build a simple index portfolio and stay on track. No sign-up needed.", "0.8", "monthly"),
    "videos": ("Smart TV: Market & Money Videos | Smart.Market",
               "Fresh market news and money explainers from leading finance channels, updated automatically, plus Smart.Market's own videos.", "0.6", "daily"),
    "get-matched": ("Request a Free Financial Advisor Consultation | Smart.Market",
                    "Tell us your goals in 2 minutes and we'll introduce you to licensed professionals who fit your needs. Free and no obligation.", "1.0", "monthly"),
    "championship": ("Smart Picks Championship: Free $100K Virtual Investing Contest | Smart.Market",
                     "Build a $100,000 virtual portfolio, beat the benchmarks and compete each month. Free to enter; sponsor-funded prizes; no purchase necessary.", "0.8", "daily"),
    "support": ("Support Smart.Market: Memberships, Contributions & Prize Sponsorship",
                "Help keep free money tools free. Pledge a one-time or monthly contribution, fund a championship prize or support outreach and new creators.", "0.6", "monthly"),
    "partners": ("Advertise, Sponsor & Partner with Smart.Market",
                 "Newsletter and championship sponsorships, video integrations, advisor partnerships and domain inquiries. Request a proposal.", "0.6", "monthly"),
    "careers": ("Careers & Contributors | Smart.Market",
                "Open roles for writers, video producers, engineers and marketers, plus paid freelance contributor opportunities.", "0.5", "monthly"),
    "about": ("About Smart.Market: Mission, Editorial Standards & How We Make Money",
              "Who we are, how our content is researched and updated, how we make money, and our corrections policy.", "0.5", "monthly"),
    "contact": ("Contact Smart.Market", "Questions, feedback, corrections, press, partnerships and domain inquiries.", "0.5", "monthly"),
    "privacy": ("Privacy Policy | Smart.Market", "How Smart.Market collects, uses and protects information, including advertising cookies and your choices.", "0.3", "yearly"),
    "terms": ("Terms, Disclaimers, Disclosures & Trademarks | Smart.Market",
              "Terms of use, investment disclaimer, advertiser disclosure, contest rules, data attribution and trademark and copyright notices.", "0.3", "yearly"),
    "404": ("Page not found | Smart.Market", "The page you were looking for could not be found.", None, None),
}

NAV = [("markets", "Markets"), ("brief", "Daily Brief"), ("news", "News"), ("screener", "Screener"), ("tools", "Calculators"),
       ("learn", "Academy"), ("videos", "Videos"), ("championship", "Championship")]

LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--accent)"/><path d="M7 21l5-6 4 3 5-7 4 4" stroke="var(--accent-ink)" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="15" r="2.2" fill="#E8A200"/></svg>'
ICON = {
    "search": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    "theme": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    "menu": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
}
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">')

generated = []


def esc(s):
    return html.escape(str(s), quote=True)


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path) or ROOT, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    generated.append(rel.replace(os.sep, "/"))


def load_json(name):
    p = os.path.join(DATA, name)
    if not os.path.exists(p):
        return None
    try:
        return json.loads(read(p))
    except Exception:
        return None


# ---------------------------------------------------------------- layout

def partner_bar():
    return (f'<div class="partner-bar"><div class="wrap"><a href="{PARTNER_LINK}" target="_blank" rel="noopener">'
            '<b>Contact</b>, if you are interested in this website / domain name / sponsorship / advertisement / partnership →</a></div></div>')


def header(active):
    ac = ' aria-current="page"'
    links = "".join(f'<a href="/{s}.html"{ac if s == active else ""}>{t}</a>' for s, t in NAV)
    sup = ac if active == "support" else ""
    return f'''<a class="sr-only" href="#main">Skip to content</a>
{partner_bar()}
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="/" aria-label="Smart.Market home">{LOGO}<span>Smart<span class="dot">.</span>Market</span></a>
    <nav class="nav-links" aria-label="Main">{links}<a href="/support.html"{sup}>Support</a></nav>
    <div class="nav-cta">
      <button class="icon-btn" data-action="search" aria-label="Search any stock or crypto">{ICON["search"]}</button>
      <button class="icon-btn" data-action="theme" aria-label="Toggle dark mode">{ICON["theme"]}</button>
      <a class="btn primary hide-m" href="/get-matched.html">Free advisor request</a>
      <button class="icon-btn menu-btn" data-action="menu" aria-label="Open menu" aria-expanded="false">{ICON["menu"]}</button>
    </div>
  </div>
  <div class="tape" data-tv="ticker-tape" aria-label="Live market ticker"></div>
</header>'''


def footer():
    yr = NOW.year
    return f'''<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="stack" style="--gap:12px">
        <a class="brand" href="/">{LOGO}<span>Smart<span class="dot">.</span>Market</span></a>
        <p class="muted small" style="max-width:38ch">Live market intelligence, an automatic daily brief, free money tools and plain-English guides for people who want to make the smart move.</p>
        <form data-form="newsletter" data-replace="no" data-success="You're on the list" class="inline-form"><input type="hidden" name="source" value="footer" /><label class="sr-only" for="ft-email">Email</label><input id="ft-email" name="email" type="email" required placeholder="Your email" /><button class="btn primary sm" type="submit">Join</button></form>
      </div>
      <div><h4>Markets</h4><ul><li><a href="/markets.html">Markets today</a></li><li><a href="/brief.html">Daily brief</a></li><li><a href="/news.html">Market news</a></li><li><a href="/screener.html">Stock screener</a></li><li><a href="/markets.html#calendar">Economic calendar</a></li></ul></div>
      <div><h4>Learn &amp; tools</h4><ul><li><a href="/learn.html">Smart Academy</a></li><li><a href="/playbook.html">Investor Playbook</a></li><li><a href="/tools.html">Calculators</a></li><li><a href="/glossary.html">Glossary</a></li><li><a href="/compare.html">Choose a broker</a></li><li><a href="/videos.html">Videos</a></li></ul></div>
      <div><h4>Company</h4><ul><li><a href="/about.html">About &amp; editorial</a></li><li><a href="/get-matched.html">Advisor requests</a></li><li><a href="/championship.html">Championship</a></li><li><a href="/partners.html">Advertise / partner</a></li><li><a href="/careers.html">Careers</a></li><li><a href="/support.html">Support us</a></li><li><a href="/contact.html">Contact</a></li></ul></div>
      <div><h4>Legal</h4><ul><li><a href="/privacy.html">Privacy policy</a></li><li><a href="/terms.html">Terms of use</a></li><li><a href="/terms.html#disclaimer">Investment disclaimer</a></li><li><a href="/terms.html#affiliate">Advertiser disclosure</a></li><li><a href="/terms.html#trademarks">Trademarks &amp; copyright</a></li><li><a href="/terms.html#contest">Contest rules</a></li></ul></div>
    </div>
    <div class="fineprint">
      <p><b>© {yr} Smart.Market. All rights reserved.</b> Smart.Market™, the Smart.Market logo, "Smart Score", "Smart Open" and "Smart Picks Championship" are trademarks of the site owner, a Webworks Media Network property. All site content, design, text, graphics and code are protected by copyright; reproduction without written permission is prohibited. Third-party names, indices, logos and trademarks (for example S&amp;P 500®, Nasdaq®, Dow Jones®, TradingView®, YouTube™) belong to their respective owners and are used for identification only; no endorsement or affiliation is implied. See <a href="/terms.html#trademarks">trademarks &amp; copyright</a>.</p>
      <p>Educational content only, not investment, tax or legal advice. Smart.Market is not a registered investment adviser, broker-dealer or financial planner. Investing involves risk, including loss of principal. Market data may be delayed and is provided "as is" by third-party sources (see <a href="/terms.html#data">data attribution</a>). Some links may be from partners who compensate us; see our <a href="/terms.html#affiliate">advertiser disclosure</a>.</p>
    </div>
  </div>
</footer>'''


def jsonld_base(slug, title, desc, url):
    graph = [
        {"@type": "Organization", "@id": SITE + "/#org", "name": NAME, "url": SITE + "/", "logo": SITE + "/favicon.svg"},
        {"@type": "WebSite", "@id": SITE + "/#site", "url": SITE + "/", "name": NAME, "publisher": {"@id": SITE + "/#org"}},
        {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": desc, "isPartOf": {"@id": SITE + "/#site"}, "dateModified": NOW.isoformat()},
    ]
    return graph


def page(slug, title, desc, body, active=None, url=None, extra_ld=None, og_type="website", noindex=False):
    url = url or (SITE + "/" if slug == "index" else f"{SITE}/{slug}.html")
    graph = jsonld_base(slug, title, desc, url) + (extra_ld or [])
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="{"noindex, follow" if noindex else "index, follow, max-image-preview:large"}">
<meta name="google-adsense-account" content="ca-pub-6620975821265271">
{ADSENSE}
<meta property="og:type" content="{og_type}"><meta property="og:site_name" content="{NAME}">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}/og-image.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1D45E0">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="Smart.Market" href="/feed.xml">
<script>try{{var t=localStorage.getItem("sm_theme");if(t)document.documentElement.setAttribute("data-theme",JSON.parse(t))}}catch(e){{}}</script>
{FONTS}
<link rel="stylesheet" href="/assets/styles.css?v={ASSET_V}">
<script type="application/ld+json">{ld}</script>
</head>
<body data-page="{slug}">
{header(active or slug)}
<main id="main">
{body}
</main>
{footer()}
<script src="/assets/config.js?v={ASSET_V}"></script>
<script src="/assets/data.js?v={ASSET_V}"></script>
<script src="/assets/app.js?v={ASSET_V}"></script>
</body>
</html>
'''


# ---------------------------------------------------------------- articles

def parse_md(path):
    raw = read(path)
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
    meta, body = {}, raw
    if m:
        body = m.group(2)
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                v = v.strip()
                if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                    v = v[1:-1]
                meta[k.strip()] = v
    meta.setdefault("slug", os.path.splitext(os.path.basename(path))[0])
    return meta, body


CAT_HUE = {"Start here": 228, "Retirement": 280, "Tax-smart": 100, "Money Math": 30, "Markets": 350, "Income": 190, "Advisors": 150, "Crypto": 45}

CTA = {
    "advisor": ('Talk it through with a professional', 'Tell us your goals and we\'ll introduce you to licensed professionals who fit your situation. Free, no obligation.', '/get-matched.html', 'Request a free consultation →'),
    "broker": ('Ready to pick an account?', 'Use our interactive matcher and 7-point checklist to find the type of investing account that fits you.', '/compare.html', 'Open the broker matcher →'),
    "newsletter": ('Get new guides and the daily brief', 'Join the Smart Open list for new Academy guides and market briefs. Free; unsubscribe anytime.', '#newsletter', 'Join free →'),
}


def build_articles():
    arts = []
    for path in sorted(glob.glob(os.path.join(ARTICLES, "*.md"))):
        meta, body = parse_md(path)
        md = markdown.Markdown(extensions=["tables", "sane_lists", "toc", "attr_list"], extension_configs={"toc": {"permalink": False}})
        html_body = md.convert(body)
        meta["html"] = html_body
        meta["toc"] = [(t["id"], t["name"]) for t in md.toc_tokens if t["level"] == 2] if hasattr(md, "toc_tokens") else []
        # FAQ for structured data
        faqs = []
        fm = re.search(r'<h2[^>]*>Frequently asked questions</h2>(.*?)(?=<h2|$)', html_body, re.S | re.I)
        if fm:
            for q, a in re.findall(r'<h3[^>]*>(.*?)</h3>\s*(.*?)(?=<h3|$)', fm.group(1), re.S):
                faqs.append((re.sub("<[^>]+>", "", q).strip(), re.sub("<[^>]+>", "", a).strip()[:600]))
        meta["faqs"] = faqs
        meta["words"] = len(re.sub("<[^>]+>", " ", html_body).split())
        arts.append(meta)
    for a in arts:
        slug = a["slug"]
        url = f"{SITE}/learn/{slug}.html"
        related = [r for r in arts if r is not a and r.get("category") == a.get("category")][:3]
        if len(related) < 3:
            related += [r for r in arts if r is not a and r not in related][: 3 - len(related)]
        toc = "".join(f'<li><a href="#{i}">{esc(n)}</a></li>' for i, n in a["toc"] if n.lower() not in ("key takeaways",))
        calc = a.get("calculator", "none")
        calc_html = (f'<section class="panel lift" style="margin-block:28px"><span class="eyebrow">Try the numbers</span><h2 style="margin:8px 0 14px;font-size:1.4rem">Interactive calculator</h2>'
                     f'<div data-widget="calc" data-calcs="{esc(calc)}" id="art-calc"></div></section>') if calc and calc != "none" else ""
        c = CTA.get(a.get("cta", "newsletter"), CTA["newsletter"])
        cta_html = f'<aside class="band accent" style="margin-block:28px"><div><span class="eyebrow">Next step</span><h2 style="margin-top:8px;font-size:1.5rem">{c[0]}</h2><p style="margin-top:8px">{c[1]}</p></div><div><a class="btn amber lg block" href="{c[2]}">{c[3]}</a></div></aside>'
        rel_html = "".join(f'<a class="article-card" href="/learn/{r["slug"]}.html"><div class="cover" style="background:linear-gradient(135deg,hsl({CAT_HUE.get(r.get("category"),210)} 70% 38%),hsl({CAT_HUE.get(r.get("category"),210)+40} 65% 25%))">{esc(r.get("category",""))}</div><div class="body"><h4>{esc(r["title"])}</h4><span class="meta">{esc(r.get("level",""))} · {esc(r.get("minutes",""))} min read</span></div></a>' for r in related)
        upd = a.get("updated", TODAY)
        body = f'''<article class="wrap article" itemscope itemtype="https://schema.org/Article">
  <div class="crumbs"><a href="/">Home</a> / <a href="/learn.html">Academy</a> / {esc(a.get("category",""))}</div>
  <header class="article-head">
    <span class="eyebrow">{esc(a.get("category",""))} · {esc(a.get("level",""))}</span>
    <h1 itemprop="headline">{esc(a["title"])}</h1>
    <p class="lede">{esc(a.get("description",""))}</p>
    <div class="byline"><span>By <b itemprop="author">Smart.Market Editorial Team</b></span><span>Updated <time itemprop="dateModified" datetime="{esc(upd)}">{esc(upd)}</time></span><span>{esc(a.get("minutes",""))} min read</span><a href="/about.html#editorial">How we research</a></div>
  </header>
  <div class="article-grid">
    <div class="prose article-body" itemprop="articleBody">{a["html"]}
      {calc_html}
      {cta_html}
      <p class="xs muted">This guide is for education only and is not personalized financial, tax or legal advice. Rules and limits change; confirm current figures with official sources. Spotted an error? <a href="/contact.html">Tell us</a> and we'll correct it.</p>
    </div>
    <aside class="article-side">
      <div class="panel toc"><h4>On this page</h4><ol>{toc}</ol></div>
      <div class="panel"><h4>Share</h4><div class="row" style="--gap:6px;margin-top:8px" data-share></div></div>
      <div class="panel" style="background:var(--accent-soft);border-color:transparent"><h4>Free advisor request</h4><p class="small muted" style="margin-top:6px">Get matched with licensed professionals. No cost, no obligation.</p><a class="btn primary sm block" style="margin-top:10px" href="/get-matched.html">Start in 2 minutes</a></div>
    </aside>
  </div>
  <section class="section tight"><h2 style="font-size:1.4rem;margin-bottom:14px">Keep reading</h2><div class="grid g3">{rel_html}</div></section>
</article>'''
        ld = [{"@type": "Article", "headline": a["title"], "description": a.get("description", ""), "datePublished": upd, "dateModified": upd,
               "author": {"@type": "Organization", "name": "Smart.Market Editorial Team", "url": SITE + "/about.html"},
               "publisher": {"@id": SITE + "/#org"}, "mainEntityOfPage": url, "wordCount": a["words"], "articleSection": a.get("category", "")},
              {"@type": "BreadcrumbList", "itemListElement": [
                  {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                  {"@type": "ListItem", "position": 2, "name": "Academy", "item": SITE + "/learn.html"},
                  {"@type": "ListItem", "position": 3, "name": a["title"], "item": url}]}]
        if a["faqs"]:
            ld.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": t}} for q, t in a["faqs"]]})
        write(f"learn/{slug}.html", page("article", f'{a["title"]} | Smart.Market', a.get("description", ""), body, active="learn", url=url, extra_ld=ld, og_type="article"))
    return arts


def articles_grid(arts, limit=None):
    out = []
    for a in arts[: limit or len(arts)]:
        hue = CAT_HUE.get(a.get("category"), 210)
        out.append(f'<a class="article-card" href="/learn/{a["slug"]}.html" data-cat="{esc(a.get("category",""))}" data-level="{esc(a.get("level",""))}"><div class="cover" style="background:linear-gradient(135deg,hsl({hue} 70% 38%),hsl({hue+40} 65% 25%))">{esc(a.get("category",""))}</div><div class="body"><h4>{esc(a["title"])}</h4><p class="small muted">{esc(a.get("description","")[:120])}…</p><span class="meta">{esc(a.get("level",""))} · {esc(a.get("minutes",""))} min read</span></div></a>')
    return "".join(out)


# ---------------------------------------------------------------- briefs

def brief_html(b, standalone=True):
    secs = "".join(f'<section><h2>{esc(s.get("h",""))}</h2><p>{esc(s.get("p",""))}</p></section>' for s in b.get("sections", []))
    asof = b.get("marketAsOf") or b.get("updated", "")
    return f'''<div class="brief-doc prose">
  <p class="eyebrow">Market brief · {esc(b.get("dateLabel",""))}</p>
  <h1 style="margin-top:10px">{esc(b.get("headline","Market brief"))}</h1>
  <p class="xs muted" style="margin-top:8px">Written automatically from market data{" and edited by AI" if b.get("polished") else ""} · data as of <time datetime="{esc(asof)}">{esc(asof[:16].replace("T"," "))} UTC</time> · prices may be delayed.</p>
  {secs}
  <p class="xs muted">This brief is generated from public market data for education. It is not investment advice or a recommendation to buy or sell any security.</p>
</div>'''


def build_briefs():
    files = sorted(glob.glob(os.path.join(DATA, "briefs", "*.json")), reverse=True)
    briefs = []
    for f in files[:400]:
        try:
            b = json.loads(read(f))
            b["date"] = b.get("date") or os.path.basename(f)[:-5]
            briefs.append(b)
        except Exception:
            pass
    for b in briefs:
        d = b["date"]
        url = f"{SITE}/brief/{d}.html"
        nav = f'<p class="small" style="margin-top:20px"><a href="/brief.html">← Latest brief</a> · <a href="/brief/archive.html">All briefs</a></p>'
        body = f'<section class="section tight"><div class="wrap" style="max-width:820px"><div class="crumbs"><a href="/">Home</a> / <a href="/brief.html">Daily brief</a> / {d}</div>{brief_html(b)}{nav}</div></section>'
        ld = [{"@type": "NewsArticle", "headline": b.get("headline", ""), "datePublished": b.get("updated", d), "dateModified": b.get("updated", d),
               "author": {"@type": "Organization", "name": "Smart.Market"}, "publisher": {"@id": SITE + "/#org"}, "mainEntityOfPage": url}]
        write(f"brief/{d}.html", page("brief-day", f'Market Brief {d}: {b.get("headline","")} | Smart.Market', f'Daily market brief for {b.get("dateLabel", d)}: {b.get("headline","")}.'[:158], body, active="brief", url=url, extra_ld=ld, og_type="article"))
    if briefs:
        rows = "".join(f'<li><a href="/brief/{b["date"]}.html"><b>{b["date"]}</b> — {esc(b.get("headline",""))}</a></li>' for b in briefs)
        body = f'<section class="page-head"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / <a href="/brief.html">Daily brief</a> / Archive</div><h1>Market brief archive</h1><p class="lede">Every daily brief, written automatically from the day\'s market data.</p></div></section><section class="section tight"><div class="wrap"><ul class="archive-list">{rows}</ul></div></section>'
        write("brief/archive.html", page("brief-archive", "Daily Market Brief Archive | Smart.Market", "Every Smart.Market daily brief, written automatically from the day's market data.", body, active="brief", url=SITE + "/brief/archive.html"))
    return briefs


# ---------------------------------------------------------------- main

def main():
    old = []
    if os.path.exists(MANIFEST):
        try:
            old = json.loads(read(MANIFEST))
        except Exception:
            old = []
    # assets
    # assets/ at the repo root is the single source of truth (served as-is)
    os.makedirs(DATA, exist_ok=True)

    arts = build_articles()
    briefs = build_briefs()
    latest = load_json("brief.json")

    ctx = {
        "{{ARTICLES_ALL}}": articles_grid(arts),
        "{{ARTICLES_6}}": articles_grid(arts[:6]),
        "{{ARTICLES_3}}": articles_grid([a for a in arts if a.get("category") in ("Start here", "Advisors", "Retirement")][:3]),
        "{{ARTICLE_COUNT}}": str(len(arts)),
        "{{CATEGORIES}}": "".join(f'<button aria-pressed="false" data-cat="{esc(c)}">{esc(c)}</button>' for c in sorted({a.get("category", "") for a in arts})),
        "{{BRIEF_STATIC}}": brief_html(latest) if latest else "",
        "{{BRIEF_LIST}}": "".join(f'<li><a href="/brief/{b["date"]}.html"><b>{b["date"]}</b> — {esc(b.get("headline",""))}</a></li>' for b in briefs[:10]),
        "{{BUILD_DATE}}": NOW.strftime("%B %d, %Y"),
        "{{YEAR}}": str(NOW.year),
    }
    for slug, (title, desc, prio, freq) in PAGES.items():
        body = read(os.path.join(SRC, "partials", slug + ".html"))
        for k, v in ctx.items():
            body = body.replace(k, v)
        extra = []
        write(f"{slug}.html", page(slug, title, desc, body, noindex=(slug == "404"), extra_ld=extra))

    # support files
    favicon = LOGO.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg"').replace("var(--accent-ink)", "#FFFFFF").replace("var(--accent)", "#1D45E0")
    write("favicon.svg", favicon)
    write("og-image.svg", f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0D1526"/><rect x="80" y="80" width="120" height="120" rx="28" fill="#1D45E0"/><path d="M110 165l25-30 20 15 25-35 20 20" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="80" y="330" fill="#fff" font-family="Arial, sans-serif" font-size="92" font-weight="800">Smart.Market</text><text x="80" y="410" fill="#AEB8CE" font-family="Arial, sans-serif" font-size="40">Live markets · Daily brief · Free money tools</text><text x="80" y="540" fill="#E8A200" font-family="Arial, sans-serif" font-size="34">Make the smart move with your money.</text></svg>')
    write("ads.txt", "google.com, pub-6620975821265271, DIRECT, f08c47fec0942fa0\n")
    write("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /_source/\nDisallow: /404.html\n\nSitemap: {SITE}/sitemap.xml\n")
    write("CNAME", "smart.market\n")
    write(".nojekyll", "")
    urls = []
    for s, p in PAGES.items():
        if p[2]:
            urls.append((SITE + "/" if s == "index" else f"{SITE}/{s}.html", TODAY if p[3] in ("hourly", "daily") else arts[0].get("updated", TODAY) if arts else TODAY, p[2], p[3]))
    for a in arts:
        urls.append((f"{SITE}/learn/{a['slug']}.html", a.get("updated", TODAY), "0.8", "monthly"))
    for b in briefs:
        urls.append((f"{SITE}/brief/{b['date']}.html", b["date"], "0.5", "never"))
    if briefs:
        urls.append((f"{SITE}/brief/archive.html", TODAY, "0.6", "daily"))
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          "".join(f"  <url><loc>{u}</loc><lastmod>{d}</lastmod><changefreq>{f}</changefreq><priority>{p}</priority></url>\n" for u, d, p, f in urls) + "</urlset>\n")
    items = [(f"Market brief {b['date']}: {b.get('headline','')}", f"{SITE}/brief/{b['date']}.html", b.get("updated", b["date"]), b.get("headline", "")) for b in briefs[:20]]
    items += [(a["title"], f"{SITE}/learn/{a['slug']}.html", a.get("updated", TODAY), a.get("description", "")) for a in arts]

    def rfc(d):
        try:
            dt = datetime.datetime.fromisoformat(str(d).replace("Z", "+00:00"))
        except Exception:
            dt = NOW
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.strftime("%a, %d %b %Y %H:%M:%S +0000")
    write("feed.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Smart.Market</title><link>' + SITE + '/</link><description>Daily market briefs and investing guides</description><language>en</language><lastBuildDate>' + rfc(NOW.isoformat()) + "</lastBuildDate>" +
          "".join(f"<item><title>{esc(t)}</title><link>{u}</link><guid>{u}</guid><pubDate>{rfc(d)}</pubDate><description>{esc(s)}</description></item>" for t, u, d, s in items) + "</channel></rss>\n")
    write("manifest.webmanifest", json.dumps({"name": NAME, "short_name": NAME, "start_url": "/", "display": "standalone", "background_color": "#F2F4F7",
                                              "theme_color": "#1D45E0", "icons": [{"src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}, indent=2))
    # remove stale generated files
    for rel in old:
        if rel not in generated:
            p = os.path.join(ROOT, rel)
            if os.path.isfile(p):
                os.remove(p)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(sorted(set(generated)), f, indent=0)
    print(f"Built {len(PAGES)} pages, {len(arts)} articles, {len(briefs)} briefs -> {ROOT}")


if __name__ == "__main__":
    main()
