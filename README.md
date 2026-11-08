# Smart.Market

Free smart-money hub: live markets, an automatic daily market brief, a stock screener, 8 calculators, 21 Academy guides, a monthly $100K virtual championship, and a lead-generation funnel for licensed advisors. Monetized by Google AdSense (Auto ads), advisor/partner referrals, sponsorships and reader support.

Live site: https://smart.market (GitHub Pages, custom domain via `CNAME`).

## Repository layout

| Path | What it is |
|---|---|
| `/*.html`, `/learn/`, `/brief/` | **Built site** served by GitHub Pages (generated, do not edit by hand) |
| `/assets/` | CSS, JS, `config.js` (all settings) and `data.js` (glossary, quiz, jobs). Served as-is and edited directly |
| `/data/` | JSON snapshots (market, news, earnings, videos, FX, daily brief) written by the daily automation |
| `_source/src/partials/` | Page bodies for the 21 pages |
| `_source/content/articles/` | Academy guides in Markdown (front matter: title, slug, description, category, level, minutes, updated, calculator, cta) |
| `_source/build.py` | Static site generator: header, footer, SEO meta, JSON-LD, sitemap, RSS, articles, brief archive |
| `_source/api-vercel/` | Data collectors (`scripts/snapshot.js`) and an optional live API for Vercel |
| `_source/automation/daily-update.yml` | GitHub Actions workflow for daily refresh (see below) |

Rebuild locally: `pip install markdown && python3 _source/build.py`

## Turn on the daily automation (one-time, 1 minute)

GitHub only lets workflow files be added by an account with the `workflow` permission, so this step is manual:

1. In this repo, create the file `.github/workflows/daily-update.yml` and paste in the contents of `_source/automation/daily-update.yml`.
2. **Settings → Actions → General → Workflow permissions →** choose *Read and write permissions*. Save.
3. **Actions → Daily update → Run workflow** once.

It then runs every weekday after the US close (21:15 UTC) and every morning (11:30 UTC): fetches market data, news, earnings, videos and FX, writes a dated market brief, rebuilds the site and commits. Optional: add an `ANTHROPIC_API_KEY` repository secret to have each brief edited by AI.

Until the first run, pages show live TradingView, CoinGecko and Frankfurter data directly in the browser, so nothing looks empty.

## GitHub Pages

**Settings → Pages → Build and deployment →** *Deploy from a branch*, branch `main`, folder `/ (root)`. Custom domain `smart.market`, *Enforce HTTPS* on. DNS: apex A records to GitHub Pages IPs, `www` CNAME to `webworksa1.github.io`.

## Forms (lead capture, contest, donations, partnerships, careers)

All forms deliver privately to the owner's inbox through FormSubmit. The destination is stored encoded in `assets/config.js` and never appears on the page.

- The **first** submission triggers a one-time FormSubmit activation email. Click the link in it.
- FormSubmit then offers a random alias. Paste it into `form.alias` in `assets/config.js` so not even the encoded address remains in the code.
- Optional: deploy `_source/api-vercel` to Vercel, set the `CONTACT_TO` environment variable, and put the deployment URL in `apiBase`. Forms then go through your own relay first.

## AdSense

- Loader script and `google-adsense-account` meta are in every page head; `ads.txt` is at the root.
- In AdSense: add the site, request review, then enable **Auto ads**. In **Privacy & messaging**, publish the Google-certified CMP message for EEA/UK/Switzerland.
- Compliance work already done: original content (21 long-form guides, daily briefs), privacy policy with Google cookie disclosure and opt-outs, terms, disclaimers, contact page, clear navigation, no fabricated data or reviews.

## Settings you will want to change (`assets/config.js`)

- `donate.links`: Stripe Payment Links / PayPal / Buy Me a Coffee / Ko-fi URLs. `donate.raised` and `supporters` update the goal bar and wall.
- `youtube.ownChannel`: your channel ID; its uploads appear first on the Videos page.
- `contest.prizes`, `prizesConfirmed`: prize table for the monthly championship.
- `partners`: affiliate cards on the broker comparison page.
- `gaId`: Google Analytics 4 measurement ID.

## Legal

© Smart.Market. All rights reserved. Smart.Market™, "Smart Score", "Smart Open" and "Smart Picks Championship" are trademarks of the site owner, a Webworks Media Network property. Third-party marks belong to their owners. Content is educational, not investment advice.
