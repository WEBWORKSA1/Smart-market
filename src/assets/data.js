/* ==========================================================================
   Smart.Market — SAMPLE DATASET
   Demo values for layout + interaction. Replace with a live feed in Phase 3
   (Financial Modeling Prep, Polygon.io, Finnhub, Twelve Data, Alpha Vantage).
   ========================================================================== */
window.SM_DATA = {
  // sym, name, sector, price, mcap ($B), pe, div yield %, beta
  stocks: [
    ["AAPL","Apple Inc.","Technology",228.4,3450,34.1,0.44,1.2],
    ["MSFT","Microsoft Corp.","Technology",441.2,3280,36.2,0.72,0.9],
    ["NVDA","NVIDIA Corp.","Technology",131.6,3220,52.4,0.03,1.7],
    ["GOOGL","Alphabet Inc.","Communication",184.9,2270,23.8,0.44,1.0],
    ["AMZN","Amazon.com Inc.","Consumer Disc.",201.3,2110,41.7,0,1.2],
    ["META","Meta Platforms","Communication",588.7,1490,27.1,0.34,1.3],
    ["AVGO","Broadcom Inc.","Technology",172.5,805,68.3,1.22,1.1],
    ["TSLA","Tesla Inc.","Consumer Disc.",248.9,795,88.6,0,2.2],
    ["BRK.B","Berkshire Hathaway","Financials",471.0,1015,13.2,0,0.8],
    ["JPM","JPMorgan Chase","Financials",232.8,660,12.6,2.1,1.1],
    ["V","Visa Inc.","Financials",301.4,590,31.0,0.78,0.95],
    ["LLY","Eli Lilly","Healthcare",868.2,825,72.4,0.65,0.45],
    ["UNH","UnitedHealth","Healthcare",512.6,472,20.4,1.6,0.6],
    ["XOM","Exxon Mobil","Energy",112.7,495,13.9,3.4,0.9],
    ["CVX","Chevron","Energy",151.3,272,14.8,4.3,1.0],
    ["WMT","Walmart","Consumer Staples",93.1,748,38.2,0.9,0.5],
    ["COST","Costco","Consumer Staples",924.5,410,54.0,0.5,0.8],
    ["PG","Procter & Gamble","Consumer Staples",168.4,396,27.3,2.4,0.4],
    ["KO","Coca-Cola","Consumer Staples",68.9,297,25.8,2.8,0.6],
    ["PEP","PepsiCo","Consumer Staples",152.7,210,22.4,3.5,0.55],
    ["JNJ","Johnson & Johnson","Healthcare",158.3,381,23.6,3.1,0.5],
    ["ABBV","AbbVie","Healthcare",194.6,344,62.0,3.3,0.6],
    ["MRK","Merck & Co.","Healthcare",101.2,256,14.1,3.1,0.4],
    ["HD","Home Depot","Consumer Disc.",402.8,400,27.2,2.2,1.0],
    ["MCD","McDonald's","Consumer Disc.",296.4,212,25.4,2.3,0.7],
    ["NKE","Nike Inc.","Consumer Disc.",78.6,117,22.9,1.9,1.1],
    ["BAC","Bank of America","Financials",44.7,344,14.3,2.3,1.3],
    ["GS","Goldman Sachs","Financials",588.3,184,15.8,2.0,1.35],
    ["MA","Mastercard","Financials",521.9,480,37.5,0.55,1.05],
    ["ORCL","Oracle Corp.","Technology",176.4,492,44.8,0.9,1.0],
    ["CRM","Salesforce","Technology",318.7,305,52.3,0.5,1.25],
    ["AMD","Advanced Micro Devices","Technology",142.3,231,118.0,0,1.8],
    ["ADBE","Adobe Inc.","Technology",489.5,216,39.2,0,1.25],
    ["NFLX","Netflix","Communication",912.4,392,46.1,0,1.3],
    ["DIS","Walt Disney","Communication",113.5,206,38.4,0.8,1.3],
    ["CAT","Caterpillar","Industrials",382.6,185,17.4,1.5,1.1],
    ["GE","GE Aerospace","Industrials",189.2,205,34.7,0.6,1.2],
    ["BA","Boeing","Industrials",164.5,123,0,0,1.5],
    ["UPS","United Parcel Service","Industrials",127.9,109,19.2,5.1,1.0],
    ["NEE","NextEra Energy","Utilities",76.8,158,21.5,2.8,0.55],
    ["DUK","Duke Energy","Utilities",115.3,89,19.8,3.6,0.45],
    ["PLD","Prologis","Real Estate",118.4,110,34.0,3.3,1.1],
    ["O","Realty Income","Real Estate",58.2,51,53.0,5.5,0.8],
    ["LIN","Linde plc","Materials",462.1,221,33.6,1.2,0.9],
    ["SHOP","Shopify","Technology",104.6,136,78.0,0,2.3],
    ["RY","Royal Bank of Canada","Financials",168.2,237,14.4,3.4,0.85],
    ["PLTR","Palantir","Technology",41.8,95,190.0,0,2.6],
    ["COIN","Coinbase","Financials",224.7,56,36.0,0,3.0]
  ],
  indices: [
    ["SPX","S&P 500",5742.3],["NDX","Nasdaq 100",20115.6],["DJI","Dow Jones",42310.5],
    ["RUT","Russell 2000",2214.8],["TSX","S&P/TSX",24012.7],["FTSE","FTSE 100",8290.4],
    ["DAX","DAX 40",19045.2],["N225","Nikkei 225",37820.1],["SENSEX","BSE Sensex",83110.3],["VIX","VIX",16.4]
  ],
  crypto: [["BTC","Bitcoin",64850],["ETH","Ethereum",2610],["SOL","Solana",148.2],["XRP","XRP",0.59],["BNB","BNB",588],["DOGE","Dogecoin",0.108]],
  commodities: [["GC","Gold /oz",2612.4],["SI","Silver /oz",31.05],["CL","WTI Crude",71.3],["BZ","Brent Crude",74.6],["NG","Natural Gas",2.41],["HG","Copper /lb",4.35]],
  fx: [["EURUSD","EUR/USD",1.1112],["GBPUSD","GBP/USD",1.3195],["USDJPY","USD/JPY",142.6],["USDCAD","USD/CAD",1.3585],["USDINR","USD/INR",83.72],["AUDUSD","AUD/USD",0.6745]],
  bonds: [["US2Y","US 2-Year",3.58],["US10Y","US 10-Year",3.71],["US30Y","US 30-Year",4.03],["CA10Y","Canada 10-Year",2.94],["DE10Y","Germany 10-Year",2.15],["UK10Y","UK 10-Year",3.83]],

  // offset in days from today, time, country, event, importance 1-3, forecast, previous
  econ: [
    [0,"08:30","US","Initial Jobless Claims",2,"230K","231K"],
    [0,"10:00","US","Existing Home Sales",2,"3.90M","3.95M"],
    [1,"09:45","US","S&P Global Manufacturing PMI",2,"48.5","47.9"],
    [1,"04:30","UK","Retail Sales m/m",2,"0.4%","0.5%"],
    [2,"08:30","CA","CPI y/y",3,"2.1%","2.5%"],
    [3,"10:00","US","Consumer Confidence",2,"103.9","105.6"],
    [4,"14:00","US","FOMC Meeting Minutes",3,"—","—"],
    [5,"08:30","US","GDP q/q (Final)",3,"3.0%","3.0%"],
    [6,"08:30","US","Core PCE Price Index m/m",3,"0.2%","0.2%"],
    [7,"21:30","CN","Manufacturing PMI",2,"49.4","49.1"],
    [8,"08:30","US","Nonfarm Payrolls",3,"145K","142K"],
    [8,"08:30","US","Unemployment Rate",3,"4.2%","4.2%"]
  ],
  // offset days, sym, timing, EPS est
  earnings: [
    [0,"FDX","After close","5.30"],[1,"LEN","After close","4.18"],[2,"COST","After close","5.08"],
    [2,"MU","After close","1.11"],[3,"NKE","After close","0.52"],[4,"PAYX","Before open","1.15"],
    [5,"CCL","Before open","1.16"],[6,"CAG","Before open","0.60"],[7,"PEP","Before open","2.29"],
    [8,"DAL","Before open","1.53"],[9,"JPM","Before open","4.01"],[9,"WFC","Before open","1.28"]
  ],
  glossary: [
    ["Asset allocation","How a portfolio is split among stocks, bonds, cash and other assets. It drives most long-run return variation."],
    ["Basis point","One hundredth of a percentage point (0.01%). A rate move from 4.00% to 4.25% is 25 basis points."],
    ["Bear market","A decline of 20% or more from a recent high in a broad index."],
    ["Beta","How much a stock tends to move relative to the market. Beta 1.5 ≈ 50% more volatile than the index."],
    ["Bid–ask spread","The gap between the highest price a buyer will pay and the lowest a seller will accept. A hidden trading cost."],
    ["Bull market","A sustained rise of 20% or more from a recent low."],
    ["Capital gain","Profit from selling an asset for more than you paid. Taxed differently from income in most countries."],
    ["Compound interest","Earning returns on previous returns. $10,000 at 7% becomes ~$76,000 in 30 years without new contributions."],
    ["Dividend yield","Annual dividends per share ÷ share price. A $100 stock paying $3/yr yields 3%."],
    ["Dollar-cost averaging","Investing a fixed amount on a schedule regardless of price, which smooths entry points."],
    ["EPS","Earnings per share: net income ÷ shares outstanding. The 'E' in P/E."],
    ["ETF","Exchange-traded fund. A basket of securities that trades like a single stock, usually with low fees."],
    ["Expense ratio","The annual fee a fund charges as a % of assets. 0.03% vs 1.00% compounds into a large gap over decades."],
    ["Free cash flow","Operating cash flow minus capital spending. Cash a business can return to owners."],
    ["Index fund","A fund that tracks a market index like the S&P 500 instead of picking stocks."],
    ["Inflation","The rate prices rise over time, eroding the purchasing power of cash."],
    ["Liquidity","How quickly an asset can be sold near its fair price."],
    ["Market capitalization","Share price × shares outstanding. Large cap is typically $10B+."],
    ["Moat","A durable competitive advantage (brand, network effects, cost, switching costs) that protects profits."],
    ["P/E ratio","Price ÷ earnings per share. How many dollars investors pay for $1 of annual profit."],
    ["Rebalancing","Selling what grew and buying what shrank to return to target allocation."],
    ["REIT","Real estate investment trust. Owns income property and must pay out most taxable income as dividends."],
    ["Short selling","Borrowing shares to sell now and buy back later, profiting if the price falls. Losses are theoretically unlimited."],
    ["Stop-loss order","An order that sells automatically if the price falls to a set level."],
    ["Volatility","How much and how fast prices swing. Often measured by standard deviation or the VIX."],
    ["Yield curve","A chart of bond yields across maturities. An inverted curve has historically preceded recessions."],
    ["TFSA / Roth IRA","Tax-advantaged accounts (Canada / US) where qualified growth and withdrawals are tax-free."],
    ["RRSP / 401(k)","Tax-deferred retirement accounts (Canada / US). Contributions reduce taxable income today."]
  ],
  quiz: [
    ["A fund charges a 1% expense ratio. On a $100,000 balance, what do you pay per year?",["$10","$100","$1,000","$10,000"],2],
    ["Which usually has the highest long-run expected return?",["Savings account","Government bonds","Broad stock index","Cash under the mattress"],2],
    ["A stock trades at $50 with EPS of $2.50. What is its P/E?",["10","20","25","125"],1],
    ["The 'Rule of 72' says money at 8% doubles in about…",["6 years","9 years","12 years","72 months"],1],
    ["Dollar-cost averaging mainly reduces…",["Taxes","Fees","Timing risk","Inflation"],2]
  ],
  articles: [
    ["Start here","How to invest your first $1,000 (without regretting it)","Beginner",8,228],
    ["Smart Money 101","Index funds explained: why most pros can't beat them","Beginner",7,150],
    ["Money Math","The true cost of a 1% fee over 30 years","Intermediate",6,30],
    ["Income Lab","Building a dividend portfolio that pays $1,000 a month","Intermediate",11,190],
    ["Retirement","How much do you really need to retire? A number-first guide","Intermediate",12,280],
    ["Markets","Reading the yield curve like an economist","Advanced",9,350],
    ["Tax-smart","TFSA vs RRSP vs Roth IRA vs 401(k): the decision tree","Intermediate",10,100],
    ["Crypto","Bitcoin in a portfolio: sizing it without blowing up","Intermediate",8,45],
    ["Behavior","The 7 mistakes that cost investors the most (with data)","Beginner",9,0]
  ],
  jobs: [
    ["Senior Markets Writer (CFA/CFP preferred)","Editorial","Remote · Americas","Full-time"],
    ["Video Producer — Opening Bell","Video","Remote · North America","Full-time"],
    ["Growth Marketer (SEO + Paid)","Marketing","Remote · Global","Full-time"],
    ["Front-end Engineer (JS/Charts)","Engineering","Remote · Global","Contract"],
    ["Partnerships Manager — Advisors & Brokers","Partnerships","Remote · US/Canada","Full-time"],
    ["Community & Contest Moderator","Community","Remote · Global","Part-time"],
    ["Freelance Contributor — Personal Finance","Editorial","Remote · Global","Per article"],
    ["Data Analyst — Market Data","Data","Remote · Global","Contract"]
  ],
  // name, best for, rating, min deposit, stock trades, key bonus, features[], pros[], cons[]
  brokers: [
    ["Broker One","Best overall for long-term investors",4.8,"$0","$0","Up to $1,000 in cash bonus*",["Fractional shares","IRA / TFSA","Auto-invest"],["Top-rated research","Strong customer support"],["Options cost extra per contract"]],
    ["Broker Two","Best for active traders",4.7,"$0","$0","Free stocks on funding*",["Advanced charting","Level 2 data","Paper trading"],["Pro-grade tools free","Extended hours"],["Busy interface for beginners"]],
    ["Broker Three","Best for global markets",4.6,"$0","$0 US / low intl","Interest on idle cash*",["150+ markets","Multi-currency","Low margin rates"],["Institutional pricing","Huge product range"],["Steeper learning curve"]],
    ["Broker Four","Best for beginners",4.5,"$0","$0","Match on transfers*",["Clean app","Learn-while-you-invest","Recurring buys"],["Simplest onboarding","Great mobile UX"],["Limited research depth"]],
    ["Broker Five","Best for social & copy trading",4.3,"$50","$0","Referral bonus*",["Copy trading","Crypto","Community feed"],["Social features","Easy diversification"],["FX conversion fees"]],
    ["Broker Six","Best robo-advisor",4.4,"$0","n/a (managed)","Months managed free*",["Auto-rebalancing","Tax-loss harvesting","Goal planning"],["Hands-off","Low all-in fee"],["No individual stock picking"]]
  ]
};
