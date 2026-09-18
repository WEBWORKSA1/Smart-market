#!/usr/bin/env python3
"""Smart.Market static site builder.

    python3 build.py

Outputs
  dist/            multi-page static site (deploy to Netlify / Vercel / GitHub Pages / Cloudflare Pages)
  preview.html     single-file preview (all pages as hash routes, everything inlined)
Add a page: create src/partials/<slug>.html and add an entry to PAGES.
"""
import html, json, os, re, shutil, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, DIST = os.path.join(ROOT, "src"), os.path.join(ROOT, "dist")
SITE = "https://smart.market"
TODAY = datetime.date.today().isoformat()

# slug: (title, meta description, sitemap priority)
PAGES = {
    "index": ("Smart.Market | Free Market Data, Stock Screener, Calculators & Advisor Matching",
              "Live markets, a free stock screener, 7 money calculators, a $100K investing championship and free matching with vetted fiduciary advisors.", "1.0"),
    "markets": ("Markets Today: Indices, Stocks, Crypto, Heatmap & Calendars | Smart.Market",
                "Track the S&P 500, Nasdaq, TSX, crypto, gold, oil, currencies and bond yields with a live heatmap, sentiment gauge and economic calendar.", "0.9"),
    "screener": ("Free Stock Screener with Smart Score | Smart.Market",
                 "Screen large-cap stocks by sector, market cap, P/E and dividend yield. Six presets and a 0-100 Smart Score.", "0.9"),
    "tools": ("Free Financial Calculators: Compound Interest, Retirement, Mortgage & More | Smart.Market",
              "Compound interest, retirement/FIRE, mortgage, loan EMI, dividend income, position size and inflation calculators with live charts.", "0.9"),
    "compare": ("Best Investing Platforms Compared (Fees, Bonuses, Features) | Smart.Market",
                "Compare brokers and investing apps side by side: fees, minimums, promotions, features, pros and cons.", "0.8"),
    "get-matched": ("Find a Fiduciary Financial Advisor Near You: Free Matching | Smart.Market",
                    "Answer 6 questions and get matched with up to 3 vetted fiduciary advisors. Free, no obligation, about 3 minutes.", "1.0"),
    "championship": ("Smart Picks Championship: Free $100K Stock Market Game with Prizes | Smart.Market",
                     "Trade a $100,000 virtual portfolio, climb the live leaderboard and win real prizes. Free to enter; no purchase necessary.", "0.9"),
    "learn": ("Smart Academy: Investing Guides, Glossary & Quiz | Smart.Market",
              "Plain-English investing guides reviewed by credentialed pros, a searchable glossary, term of the day and a knowledge quiz.", "0.8"),
    "videos": ("Smart TV: Market News & Money Explainers on YouTube | Smart.Market",
               "The Opening Bell every weekday, Smart Money 101 explainers and monthly Championship recaps.", "0.7"),
    "support": ("Support Smart.Market: Memberships & Contributions",
                "Back independent money tools. Monthly memberships, one-time contributions, and prize sponsorship for the Championship.", "0.6"),
    "partners": ("Advertise & Partner with Smart.Market: Leads, Sponsorships, Video",
                 "Advisor leads, newsletter and Championship sponsorships, and YouTube integrations that reach investors in context.", "0.6"),
    "careers": ("Careers & Contributors | Smart.Market",
                "Remote roles for writers, video producers, engineers and marketers, plus paid freelance contributor opportunities.", "0.5"),
    "about": ("About Smart.Market: Mission & Editorial Standards", "Our mission, editorial standards, how we make money and corrections policy.", "0.5"),
    "contact": ("Contact Smart.Market", "Questions, feedback, corrections, press and partnerships.", "0.4"),
    "privacy": ("Privacy Policy | Smart.Market", "How Smart.Market collects, uses and protects your information.", "0.3"),
    "terms": ("Terms, Disclaimers & Disclosures | Smart.Market", "Investment disclaimer, affiliate disclosure, advisor matching terms and Championship official rules.", "0.3"),
    "404": ("Page not found | Smart.Market", "The page you were looking for could not be found.", None),
}

NAV = [("markets", "Markets"), ("screener", "Screener"), ("tools", "Calculators"), ("compare", "Compare"),
       ("learn", "Academy"), ("videos", "Videos"), ("championship", "Championship")]

LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--accent)"/><path d="M7 21l5-6 4 3 5-7 4 4" stroke="var(--accent-ink)" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="15" r="2.2" fill="#E8A200"/></svg>'
ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
ICON_THEME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>'


def header():
    links = "".join(f'<a href="{s}.html" data-page="{s}">{t}</a>' for s, t in NAV)
    return f'''<a class="sr-only" href="#main">Skip to content</a>
<div class="topbar"><div class="wrap"><span>📈 <b>Smart Open</b>: the free 5-minute market brief, every weekday at 7 a.m. ET</span><a href="index.html#newsletter">Subscribe free →</a></div></div>
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="index.html" aria-label="Smart.Market home">{LOGO}<span>Smart<span class="dot">.</span>Market</span></a>
    <nav class="nav-links" aria-label="Main">{links}<a href="support.html" data-page="support">Support</a></nav>
    <div class="nav-cta">
      <button class="icon-btn" data-action="search" aria-label="Search markets">{ICON_SEARCH}</button>
      <button class="icon-btn" data-action="theme" aria-label="Toggle dark mode">{ICON_THEME}</button>
      <a class="btn primary hide-m" href="get-matched.html">Get matched</a>
      <button class="icon-btn menu-btn" data-action="menu" aria-label="Open menu" aria-expanded="false">{ICON_MENU}</button>
    </div>
  </div>
  <div class="tape" data-widget="tape" aria-label="Market ticker"></div>
</header>'''


def footer():
    return '''<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="stack" style="--gap:12px">
        <a class="brand" href="index.html">''' + LOGO + '''<span>Smart<span class="dot">.</span>Market</span></a>
        <p class="muted small" style="max-width:36ch">Free market intelligence, money tools and expert matching for people who want to make the smart move.</p>
        <form data-form="newsletter" data-replace="no" data-success="Subscribed to Smart Open" class="inline-form"><input type="hidden" name="source" value="footer" /><label class="sr-only" for="ft-email">Email</label><input id="ft-email" name="email" type="email" required placeholder="Your email" /><button class="btn primary sm" type="submit">Subscribe</button></form>
      </div>
      <div><h4>Markets</h4><ul><li><a href="markets.html">Markets today</a></li><li><a href="screener.html">Stock screener</a></li><li><a href="markets.html#calendar">Economic calendar</a></li><li><a href="markets.html#earnings">Earnings calendar</a></li></ul></div>
      <div><h4>Tools</h4><ul><li><a href="tools.html">Calculators</a></li><li><a href="compare.html">Compare brokers</a></li><li><a href="get-matched.html">Find an advisor</a></li><li><a href="championship.html">Championship</a></li></ul></div>
      <div><h4>Company</h4><ul><li><a href="about.html">About &amp; editorial</a></li><li><a href="partners.html">Advertise / partner</a></li><li><a href="careers.html">Careers</a></li><li><a href="contact.html">Contact</a></li><li><a href="support.html">Support us</a></li></ul></div>
      <div><h4>Legal</h4><ul><li><a href="privacy.html">Privacy</a></li><li><a href="terms.html">Terms</a></li><li><a href="terms.html#affiliate">Affiliate disclosure</a></li><li><a href="terms.html#contest">Contest rules</a></li></ul></div>
    </div>
    <p class="fineprint">© <span data-year></span> Smart.Market. Educational content only, not investment, tax or legal advice. Smart.Market is not a registered investment adviser or broker-dealer. Investing involves risk, including loss of principal. Market data shown may be delayed or simulated. Some links are from partners who compensate us; see our <a href="terms.html#affiliate">disclosure</a>.</p>
  </div>
</footer>
<div class="sticky-cta" role="complementary" aria-label="Advisor matching offer"><div class="wrap"><span class="small"><b>Get a free second opinion on your plan.</b> Match with up to 3 fiduciary advisors in 3 minutes.</span><span class="row" style="--gap:8px"><a class="btn amber sm" href="get-matched.html">Get matched free</a><button class="icon-btn" data-x aria-label="Dismiss" style="width:34px;height:34px;background:transparent;color:inherit;border-color:rgba(255,255,255,.25)">✕</button></span></div></div>'''


FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">'

NETLIFY_FORMS = '''<div hidden aria-hidden="true">''' + "".join(
    f'<form name="{n}" data-netlify="true" netlify-honeypot="company_website"><input name="company_website"><input name="email"><input name="name"><input name="first_name"><input name="last_name"><input name="phone"><input name="zip"><input name="country"><input name="goal"><input name="age"><input name="assets"><input name="timeline"><input name="meet"><input name="consent"><input name="newsletter_optin"><input name="source"><input name="message"><input name="company"><input name="interest"><input name="budget"><input name="website"><input name="handle"><input name="role"><input name="portfolio"><input name="pitch"><input name="prize"><input name="credit"><input name="topic"><input name="_utm"><input name="_page"><input name="_ts"><input name="_type"></form>'
    for n in ["lead", "newsletter", "contact", "partner", "careers", "sponsor", "contest"]) + "</div>"


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def jsonld(slug):
    org = {"@context": "https://schema.org", "@graph": [
        {"@type": "Organization", "@id": SITE + "/#org", "name": "Smart.Market", "url": SITE, "logo": SITE + "/favicon.svg",
         "sameAs": ["https://www.youtube.com/@smartmarket"]},
        {"@type": "WebSite", "@id": SITE + "/#site", "url": SITE, "name": "Smart.Market", "publisher": {"@id": SITE + "/#org"},
         "potentialAction": {"@type": "SearchAction", "target": SITE + "/screener.html?q={query}", "query-input": "required name=query"}}]}
    if slug == "championship":
        org["@graph"].append({"@type": "Event", "name": "Smart Picks Championship", "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
                              "eventStatus": "https://schema.org/EventScheduled", "startDate": "2026-10-01", "endDate": "2026-10-31",
                              "location": {"@type": "VirtualLocation", "url": SITE + "/championship.html"}, "isAccessibleForFree": True,
                              "organizer": {"@id": SITE + "/#org"}})
    return '<script type="application/ld+json">' + json.dumps(org) + "</script>"


def build_multipage():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    shutil.copytree(os.path.join(SRC, "assets"), os.path.join(DIST, "assets"))
    for slug, (title, desc, _) in PAGES.items():
        body = read(os.path.join(SRC, "partials", slug + ".html"))
        url = SITE + ("/" if slug == "index" else f"/{slug}.html")
        page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="{'noindex' if slug == '404' else 'index, follow, max-image-preview:large'}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Smart.Market">
<meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1D45E0">
<link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="manifest" href="manifest.webmanifest">
<script>try{{var t=localStorage.getItem("sm_theme");if(t)document.documentElement.setAttribute("data-theme",JSON.parse(t))}}catch(e){{}}</script>
{FONTS}
<link rel="stylesheet" href="assets/styles.css">
{jsonld(slug)}
</head>
<body data-page="{slug}">
{header()}
<main id="main">
{body}
</main>
{footer()}
{NETLIFY_FORMS if slug == 'index' else ''}
<script src="assets/config.js"></script>
<script src="assets/data.js"></script>
<script src="assets/app.js"></script>
</body>
</html>
'''
        with open(os.path.join(DIST, slug + ".html"), "w", encoding="utf-8") as f:
            f.write(page)

    # static support files
    favicon = LOGO.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg"').replace("var(--accent-ink)", "#FFFFFF").replace("var(--accent)", "#1D45E0")
    files = {
        "favicon.svg": favicon,
        "robots.txt": f"User-agent: *\nAllow: /\nDisallow: /404.html\n\nSitemap: {SITE}/sitemap.xml\n",
        "ads.txt": "# Replace pub-XXXXXXXXXXXXXXXX with your AdSense publisher id\ngoogle.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0\n",
        "sitemap.xml": '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
            f"  <url><loc>{SITE}{'/' if s == 'index' else '/' + s + '.html'}</loc><lastmod>{TODAY}</lastmod><priority>{p[2]}</priority></url>\n"
            for s, p in PAGES.items() if p[2]) + "</urlset>\n",
        "manifest.webmanifest": json.dumps({"name": "Smart.Market", "short_name": "Smart.Market", "start_url": "/", "display": "standalone",
                                            "background_color": "#F2F4F7", "theme_color": "#1D45E0",
                                            "icons": [{"src": "favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}, indent=2),
        "netlify.toml": '[build]\n  publish = "."\n\n[[redirects]]\n  from = "/*"\n  to = "/404.html"\n  status = 404\n\n[[headers]]\n  for = "/*"\n  [headers.values]\n    X-Content-Type-Options = "nosniff"\n    Referrer-Policy = "strict-origin-when-cross-origin"\n    X-Frame-Options = "SAMEORIGIN"\n',
        "vercel.json": json.dumps({"cleanUrls": False, "trailingSlash": False, "headers": [{"source": "/(.*)", "headers": [
            {"key": "X-Content-Type-Options", "value": "nosniff"}, {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"}]}]}, indent=2),
    }
    for name, content in files.items():
        with open(os.path.join(DIST, name), "w", encoding="utf-8") as f:
            f.write(content)


def spa_links(body, slug):
    body = re.sub(r'href="#([A-Za-z][\w-]*)"', lambda m: f'href="#/{slug}/{m.group(1)}"', body)
    body = re.sub(r'href="([\w-]+)\.html#([\w-]+)"', lambda m: f'href="#/{m.group(1)}/{m.group(2)}"', body)
    body = re.sub(r'href="([\w-]+)\.html"', lambda m: f'href="#/{m.group(1)}"', body)
    return body


def build_preview():
    css = read(os.path.join(SRC, "assets", "styles.css"))
    js = "\n".join(read(os.path.join(SRC, "assets", n)) for n in ["config.js", "data.js"])
    app = read(os.path.join(SRC, "assets", "app.js"))
    titles = {s: p[0] for s, p in PAGES.items()}
    mains = []
    for slug in PAGES:
        if slug == "404":
            continue
        body = read(os.path.join(SRC, "partials", slug + ".html"))
        body = body.replace('type="application/ld+json"', 'type="application/json"')
        mains.append(f'<main data-route="{slug}"{"" if slug == "index" else " hidden"}>\n{spa_links(body, slug)}\n</main>')
    hdr = spa_links(header(), "index").replace('href="#/index/newsletter"', 'href="#/index/newsletter"').replace('href="#main"', 'href="#/index"')
    out = f'''<title>Smart.Market</title>
{FONTS}
<style>
{css}
</style>
<div id="sm-root" data-page="index">
{hdr}
{"".join(mains)}
{spa_links(footer(), "index")}
</div>
<script>
{js}
window.SM_SPA = true; window.SM_TITLES = {json.dumps(titles)};
</script>
<script>
{app}
</script>
'''
    with open(os.path.join(ROOT, "preview.html"), "w", encoding="utf-8") as f:
        f.write(out)


if __name__ == "__main__":
    build_multipage()
    build_preview()
    print("Built", len(PAGES), "pages -> dist/ and preview.html")
