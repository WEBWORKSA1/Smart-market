/* ==========================================================================
   Smart.Market — SITE CONFIG  (edit this file only to go live)
   Every monetization + integration switch lives here.
   ========================================================================== */
window.SM_CONFIG = {
  siteName: "Smart.Market",
  siteUrl: "https://smart.market",
  contactEmail: "hello@smart.market",

  /* ---- Google AdSense ---------------------------------------------------
     1) Paste your publisher id (ca-pub-XXXXXXXXXXXXXXXX)
     2) Paste the slot ids you create in AdSense > Ads > By ad unit
     Empty = styled placeholders are shown instead of ads.                  */
  adsenseClient: "",
  adSlots: { leaderboard: "", rectangle: "", infeed: "", sidebar: "" },

  /* ---- Analytics (GA4 measurement id, e.g. G-XXXXXXX) ------------------ */
  gaId: "",

  /* ---- Form endpoints ---------------------------------------------------
     Any service that accepts JSON POST works: Formspree, Make/Zapier webhook,
     Google Apps Script, your CRM, Supabase edge function.
     netlifyForms:true posts url-encoded to "/" so Netlify Forms captures it. */
  netlifyForms: false,
  endpoints: {
    lead: "",        // Get Matched funnel (highest value)
    newsletter: "",  // Smart Open newsletter
    contact: "",
    partner: "",     // advertise / sponsor / list-your-firm
    careers: "",     // job + contributor applications
    sponsor: "",     // sponsor-a-prize pledges
    contest: "",     // championship registrations
    default: ""
  },

  /* ---- Donations / support ---------------------------------------------
     Create Stripe Payment Links (dashboard > Payment links) or use BMC/Ko-fi.
     "custom" is used for the free-amount button.                            */
  donate: {
    oneTime: { 10: "", 25: "", 50: "", 100: "", custom: "" },
    monthly: { supporter: "", insider: "", patron: "" },
    buyMeACoffee: "",
    kofi: "",
    paypal: "",
    goal: 25000,      // current funding goal (USD)
    raised: 16840     // update weekly (or wire to Stripe via serverless)
  },

  /* ---- YouTube ----------------------------------------------------------
     Add your channel URL + video ids (the part after v= in a YouTube link). */
  youtubeChannel: "https://www.youtube.com/@smartmarket",
  videos: [
    { id: "", title: "The Opening Bell: 5 things moving markets today", series: "Opening Bell", dur: "8:12", hue: 228 },
    { id: "", title: "Index funds vs. stock picking: what 20 years of data says", series: "Smart Money 101", dur: "14:03", hue: 150 },
    { id: "", title: "How to read an earnings report in 10 minutes", series: "Smart Money 101", dur: "10:47", hue: 30 },
    { id: "", title: "Championship recap: how the #1 portfolio won the month", series: "Championship", dur: "11:20", hue: 45 },
    { id: "", title: "Dividend investing: build a paycheck portfolio", series: "Income Lab", dur: "16:55", hue: 190 },
    { id: "", title: "Mortgage vs. invest: the math on extra payments", series: "Money Math", dur: "9:31", hue: 280 },
    { id: "", title: "Why the Fed matters to your portfolio", series: "Macro Minute", dur: "6:44", hue: 350 },
    { id: "", title: "Screener walkthrough: finding quality at a fair price", series: "Tool Tutorials", dur: "12:18", hue: 210 },
    { id: "", title: "Retire early? Running the FIRE numbers honestly", series: "Money Math", dur: "13:37", hue: 100 }
  ],

  /* ---- Affiliate links for the broker comparison page ------------------ */
  affiliates: { broker1: "#", broker2: "#", broker3: "#", broker4: "#", broker5: "#", broker6: "#" },

  /* ---- Live market widgets ----------------------------------------------
     true = inject free TradingView widgets on /markets (works on your own
     domain; blocked inside sandboxed previews). Demo engine runs otherwise.  */
  tradingViewWidgets: false,

  /* ---- Championship ---------------------------------------------------- */
  contest: { name: "Smart Picks Championship", season: "October 2026", startCash: 100000, endsAt: "2026-10-31T20:00:00-04:00" }
};
