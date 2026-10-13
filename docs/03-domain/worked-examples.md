# Worked examples

Hand-checkable walkthroughs of the [engine specification](engine-spec.md) using the **fictional sample plan** (`lib/engine/sample-plan.ts`). The figures come from running engine v1 at commit `26c783f`. They're golden values: tests assert them to within ₹1, and any change to them must be explained in the PR.

## The sample plan in brief

| Item | Value |
| --- | --- |
| Plan | Oct 2026 to Sep 2036 (120 months); raises in April |
| In-hand | ₹1,10,000, rising 8% a year |
| Expenses (Oct 2026) | Rent ₹18,000 · utilities ₹3,500 · living ₹16,000 · family support ₹15,000 (₹10,000 from Apr 2027) · term insurance ₹2,200 · health insurance ₹2,000 · internet ₹2,500 · car EMI ₹11,000 to Mar 2028 · personal loan ₹4,000 to Aug 2027 · card instalments ₹2,500 to Dec 2026. **Total ₹76,700** |
| Fixed investments | Child education plan ₹5,000 (6%) · retirement ULIP ₹8,000 (7%) · PPF ₹5,000 (+10% a year, cap ₹12,500, 7.1%). **Total ₹18,000** |
| One-time | ₹40,000 in Sep 2027 |
| Emergency fund | Target ₹4,00,000, starts at 0 |
| Goals | House 60% (₹80L today, 6% growth, target Sep 2036, debt 3 years before) · Retirement 40% |
| Assumptions | Inflation 6% · equity 11% · debt 7% · liquid 6.5% · buffer ₹7,000 |

## Example 1: the first month (Oct 2026)

```
income       1,10,000
expenses    −  76,700
fixed inv.  −  18,000
buffer      −   7,000
free        =   8,300   → all to the emergency fund (target not reached)
```

Closing emergency fund: ₹8,300. It opened at 0, so there's no growth yet.

Fixed investments grow on their opening values. The child plan opened at ₹10,000: `10,000 × (1 + m(6)) + 5,000 = ₹15,048.68`.

## Example 2: the first raise month (Apr 2027)

Raises, inflation and step-ups all apply. Card instalments ended in Dec 2026.

| Line | Calculation | Amount |
| --- | --- | --- |
| Salary | 1,10,000 × 1.08 | 1,18,800 |
| Rent, utilities, living, health, internet | each × 1.06 | 19,080 + 3,710 + 16,960 + 2,120 + 2,650 |
| Family support | step change to 10,000 this month; no inflation in the change month | 10,000 |
| Term, car EMI, personal loan | don't inflate | 2,200 + 11,000 + 4,000 |
| **Expenses** | | **71,720** |
| PPF | 5,000 × 1.10 | 5,500 |
| **Fixed investments** | 5,000 + 8,000 + 5,500 | **18,500** |
| Buffer | 7,000 × 1.06 | 7,420 |
| **Free** | 1,18,800 − 71,720 − 18,500 − 7,420 | **21,160** → emergency fund |

## Example 3: a one-time payment (Sep 2027)

The personal loan ended in Aug 2027, so expenses are ₹67,720 and free money is ₹25,160.

- The ₹40,000 one-time payment comes from the emergency fund, which has enough: `fromEmergency = 40,000`.
- Free money is untouched, and all ₹25,160 goes to the emergency fund.
- Closing emergency fund: **₹1,52,285.88**.

## Example 4: the emergency fund fills and goals start (Jun 2028)

The car EMI ended in Mar 2028. Free money is ₹41,397.60.

```
emergency fund needs   3,597.90   → toEF
rest                  37,799.70
house 60%             22,679.82
retirement 40%        15,119.88
```

Closing emergency fund: **₹4,02,085.75**, which is ≥ ₹4,00,000 − ₹1, so it's "full in Jun 2028". From Jul 2028, all ₹41,397.60 goes to goals: house ₹24,838.56, retirement ₹16,559.04.

**Fund split for the house in Jun 2028** (50 / 35 / 15):

| Fund | Exact | v1 display (round each) | v2 display (remainder to largest) |
| --- | --- | --- | --- |
| Nifty 50 index fund | 11,339.91 | ₹11,300 | ₹11,400 |
| Nifty Next 50 index fund | 7,937.94 | ₹7,900 | ₹7,900 |
| Gold ETF FoF | 3,401.97 | ₹3,400 | ₹3,400 |
| **Total** | 22,679.82 | ₹22,600 (₹100 short) | **₹22,700** (= goal rounded) |

## Example 5: the move to debt (Sep → Oct 2033)

The house target is Sep 2036 with `debtYears = 3`, so the goal earns the debt return when `i > Sep 2036 − 36 months = Sep 2033`, starting **Oct 2033**.

```
Sep 2033 closing   27,94,485.36   (earned 11%)
Oct 2033: 27,94,485.36 × (1 + m(7)) + 45,428.41 = 28,55,714.19
```

`m(7) = 1.07^(1/12) − 1 ≈ 0.5654%`.

## Example 6: the house outlook (Sep 2036)

```
years      = 119 months / 12 = 9.917
price      = 80,00,000 × 1.06^9.917     = 1,42,57,383
costs 10%                               =   14,25,738
min down 20%                            =   28,51,477
upfront needed                          =   42,77,215
house fund at Sep 2036                  =   55,61,219   → no shortfall
down payment = fund − costs             =   41,35,481
loan = price − down                     = 1,01,21,902
EMI at 8.5% for 25 years                =      81,504
in-hand in Sep 2036                     =    2,37,482
EMI share                               =      34.3%    → comfortable
```

At the horizon, retirement SIP funds are ₹40,49,991. The emergency fund is ₹6,76,010: it kept earning the liquid return after reaching its target.

## Example 7: a shortfall (in-hand ₹70,000)

Same plan, but in-hand is ₹70,000 in Oct 2026:

```
free = 70,000 − 76,700 − 18,000 − 7,000 = −31,700
```

The emergency fund is 0, so it can't cover anything.

| | v1 (today) | v2 (target) |
| --- | --- | --- |
| Deficit shown | ₹31,700 | ₹31,700 |
| Emergency fund after | 0 | 0 |
| Where the ₹31,700 went | Nowhere: it silently disappears | `carried = 31,700`, shown as owed |
| Next month (still −₹31,700) | Disappears again | `carried = 63,400` |
| Once free money is positive | Fills the EF as if nothing happened | Repays the ₹63,400 first, then the EF |

v2 makes an unaffordable plan look unaffordable, which is the point.

## Example 8: PPF step-up to its cap

```
Oct 2026  5,000
Apr 2027  5,500      (×1.10)
Apr 2028  6,050
…
Apr 2036  5,000 × 1.1^10 = 12,968.71 → capped at 12,500
```
