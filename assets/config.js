/* ==========================================================================
   Smart.Market — SITE CONFIG (the only file you need to edit to change settings)
   ========================================================================== */
window.SM_CONFIG = {
  siteName: "Smart.Market",
  siteUrl: "https://smart.market",

  /* Partnership / domain / sponsorship inquiries (shown on every page). */
  partnerUrl: "https://web.works/contact",

  /* ---- Live data -----------------------------------------------------------
     dataPath: JSON snapshots refreshed automatically by the daily GitHub Action.
     apiBase:  optional live API (the Vercel project in _source/api-vercel), e.g.
               "https://smart-market-api.vercel.app". When set it is used first. */
  dataPath: "/data/",
  apiBase: "",

  /* ---- Forms ---------------------------------------------------------------
     Every form is delivered privately to the owner's inbox. The address is never
     shown on the site. After the first submission, FormSubmit emails an
     activation link; once activated you can paste the random alias it gives you
     into `alias` so not even the encoded address remains in the code. */
  form: { alias: "", k: "bW9jLmxpYW1nQDFhc2tyb3diZXc=" },

  /* ---- Google AdSense (Auto ads; the loader is in every page <head>) ------- */
  adsenseClient: "ca-pub-6620975821265271",
  gaId: "",

  /* ---- Donations / support -------------------------------------------------
     Add Stripe Payment Links / PayPal / Buy Me a Coffee URLs when ready. Until
     then the Support page takes pledges and replies with a secure payment link. */
  donate: {
    links: { once: "", monthly: "", paypal: "", buyMeACoffee: "", kofi: "" },
    goal: 25000,
    raised: 0,
    supporters: [] // e.g. { name: "Alex", amount: 25, note: "Keep it free!" }
  },

  /* ---- YouTube --------------------------------------------------------------
     ownChannel: your channel ID (starts with UC). Its newest uploads appear first.
     channels: public finance channels whose latest uploads auto-refresh. */
  youtube: {
    ownChannel: "",
    channels: [
      { id: "UCEAZeUIeJs0IjQiqTCdVSIg", name: "Yahoo Finance", topic: "Market news" },
      { id: "UCrp_UI8XtuYfpiqluWLD7Lw", name: "CNBC Television", topic: "Market news" },
      { id: "UCIALMKvObZNtJ6AmdCLP7Lg", name: "Bloomberg Television", topic: "Global markets" },
      { id: "UCK7tptUDHh-RYDsdxO1-5QQ", name: "The Wall Street Journal", topic: "Business & economy" },
      { id: "UCDXTQ8nWmx_EhZ2v-kp7QxA", name: "Ben Felix", topic: "Evidence-based investing" },
      { id: "UCFCEuCsyWP0YkP3CZ3Mr01Q", name: "The Plain Bagel", topic: "Investing explained" }
    ]
  },

  /* ---- Championship (season rolls over automatically every month) --------- */
  contest: {
    startCash: 100000,
    prizesConfirmed: false,
    prizes: [
      { place: "1st", prize: "$1,000" }, { place: "2nd", prize: "$500" }, { place: "3rd", prize: "$250" }
    ],
    extras: "Best rookie and best dividend portfolio awards"
  },

  /* ---- Affiliate partner cards on /compare.html (empty = hidden) ----------- */
  partners: [] // e.g. { name: "Broker", bestFor: "Long-term investors", url: "https://...", points: ["$0 stock trades", "Fractional shares"] }
};
