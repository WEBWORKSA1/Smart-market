---
title: Reading the Yield Curve Like an Economist
slug: understanding-the-yield-curve
description: What the Treasury yield curve shows, why it slopes, how to read spreads and implied forward rates, and what an inverted curve can and cannot tell you.
category: Markets
level: Advanced
minutes: 7
updated: 2026-11-08
calculator: none
cta: newsletter
---

The yield curve is one of the most watched charts in finance. It plots the interest rates on government bonds across different maturities, from a few months to 30 years, on a single line. Economists, central bankers and bond traders read it as a summary of what markets expect for interest rates, inflation and growth.

This guide explains how the curve is built, what drives its shape, how to extract information from it with spreads and forward rates, and why an inverted curve deserves attention but not panic.

## Key takeaways

- The yield curve plots Treasury yields against time to maturity. Its slope reflects expected future short-term rates plus a term premium.
- A normal curve slopes upward; an inverted curve, where short-term yields exceed long-term yields, has historically preceded many US recessions, with long and variable lags.
- Spreads such as 10-year minus 2-year and 10-year minus 3-month are common ways to summarize the slope.
- Implied forward rates let you back out what the curve suggests about future short-term rates.
- The curve is a signal, not a timer. It has given false or early signals, and structural factors can distort it.

## How the yield curve is built

The US Treasury publishes daily par yield curve rates for maturities ranging from one month to 30 years. Each point represents the yield an investor would earn by buying a Treasury of that maturity and holding it to the end. Connect the points and you have the curve.

Treasuries are used because they are backed by the US government and trade in a deep, liquid market, so their yields mostly reflect interest rate expectations and compensation for time, rather than the risk that a particular borrower will fail to pay.

## What determines the shape

Two broad forces drive the curve.

**1. Expected short-term rates.** Under the expectations view, a long-term yield is roughly an average of the short-term rates investors expect over that period. If markets expect the Federal Reserve to cut rates in coming years, long-term yields may sit below short-term ones.

**2. The term premium.** Investors usually want extra compensation for locking money up longer, because long bonds are more sensitive to inflation surprises and rate changes. This premium tends to push long yields above short yields. It is not directly observable and must be estimated with models, and it can shrink or even turn negative.

Short-term yields are anchored closely to the Federal Reserve's policy rate. Long-term yields are set more by markets and reflect expectations for growth, inflation and global demand for safe assets.

## The four basic shapes

- **Normal (upward-sloping):** long yields above short yields. Often seen when the economy is expanding and policy is not unusually tight.
- **Steep:** a wide gap between short and long yields. Often appears when the central bank has cut rates and markets expect growth and inflation to pick up.
- **Flat:** little difference across maturities. Often a transition phase as policy tightens or expectations shift.
- **Inverted (downward-sloping):** short yields above long yields. Suggests markets expect rates to fall, often because they anticipate slower growth.

## Reading spreads

Rather than staring at the whole curve, analysts summarize the slope with a spread between two maturities, usually quoted in basis points (one basis point = 0.01 percentage point).

For example, with hypothetical yields of **4.60%** on the 2-year note and **4.20%** on the 10-year note:

**10-year minus 2-year spread** = 4.20% − 4.60% = **−0.40%**, or **−40 basis points**

A negative number means the curve is inverted between those two points. If the 2-year were 3.00% and the 10-year 4.50%, the spread would be **+150 basis points**, a fairly steep curve.

The two most common spreads are:

- **10-year minus 2-year:** popular with markets and widely quoted.
- **10-year minus 3-month:** favored by many researchers. The Federal Reserve Bank of New York publishes a recession-probability model based on this spread.

## Extracting implied forward rates

Here is where the curve becomes a forecasting tool. If you know the 1-year and 2-year yields, you can calculate the 1-year rate the market is implicitly pricing for one year from now.

Suppose the 1-year yield is **5.0%** and the 2-year yield is **4.5%** (using simple annual compounding). Investing for two years at 4.5% should be equivalent to investing for one year at 5.0% and then rolling into a new 1-year bond at some forward rate *f*:

(1.045)² = (1.050) × (1 + *f*)

1 + *f* = 1.092025 ÷ 1.050 = 1.04002

***f* ≈ 4.0%**

The curve implies that one-year rates will fall from about 5.0% today to about 4.0% a year from now. In reality, part of any long yield is term premium, so implied forwards blend expectations with compensation for risk. Still, this calculation is a direct way to see what an inverted curve is "saying."

## Why the curve matters for portfolios

### Bond prices and duration

Longer bonds are more sensitive to rate changes. As an illustration, a zero-coupon bond paying $100 at maturity, priced at a 4% yield, would lose roughly **1.9%** of its value if its yield rose to 5% with 2 years left, but roughly **9.1%** with 10 years left. Shifts in the curve's level and slope therefore affect bond funds very differently depending on their duration.

### Banks and lending

Banks often borrow short and lend long. A steep curve can widen their lending margins; a flat or inverted curve can squeeze them, which may tighten credit conditions.

### Cash vs bonds

When the curve is inverted, short-term instruments may yield more than long-term bonds. That does not automatically make cash the better choice: if rates fall, short-term income falls with them, while longer bonds lock in yields and may rise in price.

## What an inversion can and cannot tell you

In the US, inversions of the yield curve have preceded most recessions over the past several decades, which is why they draw headlines. But be careful with that history:

- **Timing is unreliable.** The lag between inversion and recession has varied widely, and stocks have sometimes risen for long stretches after an inversion.
- **False signals happen.** Not every inversion has been followed by a recession within a typical forecasting window.
- **Structure can distort the curve.** Central bank bond purchases, global demand for Treasuries and shifts in the term premium can flatten long yields without signaling weakness.
- **Causation is debated.** An inversion may reflect expectations of a slowdown rather than cause one, although tight credit can feed back into the economy.

Treat the curve as one input alongside employment, inflation, credit spreads and corporate earnings, not as a standalone trading signal.

## Frequently asked questions

### Where can I see the current yield curve?

The US Treasury publishes daily par yield curve rates, and the Federal Reserve publishes selected interest rates in its H.15 statistical release. Both are free.

### Does an inverted curve mean I should sell my stocks?

Not on its own. Inversions have historically come with long and variable lags, and markets have sometimes risen afterward. Decisions should rest on your goals, time horizon and overall plan.

### What is the difference between yield and interest rate?

A bond's coupon is the fixed interest it pays. Its yield is the return you earn based on the price you pay, so yield moves as prices change in the market.

This guide is educational and not a recommendation to buy or sell any security.

## Sources and further reading

- [U.S. Treasury: Interest Rate Data Center](https://home.treasury.gov/resource-center/data-chart-center/interest-rates)
- [Federal Reserve: Selected Interest Rates (H.15)](https://www.federalreserve.gov/releases/h15/)
- [Federal Reserve: Monetary Policy](https://www.federalreserve.gov/monetarypolicy.htm)
- [TreasuryDirect](https://www.treasurydirect.gov/)
- [Investor.gov, the SEC's investor education site](https://www.investor.gov/)
