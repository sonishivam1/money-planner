# UI guidelines

The look is a **passbook**: cool paper, dark ink, one teal accent, numbers in a monospace face so columns line up. It should feel calm and exact, like a bank statement that's on your side.

## Colour tokens

Defined once in `app/globals.css` as CSS variables, with a dark set under `prefers-color-scheme: dark`. Components use the tokens (`bg-surface`, `text-muted`), never raw hex values.

| Token | Use |
| --- | --- |
| `bg`, `surface`, `surface-2` | Page background, cards, inputs and nested rows |
| `ink`, `muted` | Primary and secondary text |
| `line`, `grid` | Borders, dividers, chart grid |
| `accent`, `accent-soft` | Primary actions, focus, current-month highlight, first goal in charts |
| `good`, `good-soft` | On track, ahead of plan, done |
| `warn`, `warn-soft` | Building, stretched, one-time payment this month |
| `bad`, `bad-soft` | Shortfall, behind plan, too high, destructive actions |
| `chart-2`, `chart-3` | Further chart series |

**Colour never carries meaning alone.** Every green or red value also has a sign (`+₹12k`, `−₹8k`) or a word (`Ahead`, `Short`), for colour-blind users and printouts.

**v2:** add a manual light/dark toggle in Settings, stored per user. It sets `data-theme` on `<html>`, and the tokens are redefined for both `prefers-color-scheme` and `[data-theme]`.

## Typography

| Role | Font | Notes |
| --- | --- | --- |
| Headings | Bricolage Grotesque | Balanced wrapping, slight negative tracking |
| Body | IBM Plex Sans | |
| Numbers | IBM Plex Mono, `tabular-nums` | Every amount, month and percentage in tables and cards (`.num`) |
| Eyebrow labels | Body font, 0.72rem uppercase, 0.08em tracking | Card and field labels |

## Numbers

| Context | Format | Example |
| --- | --- | --- |
| Exact monthly amounts | `inr()`: Indian grouping, no decimals | ₹1,25,000 |
| Balances, summaries, chart labels | `inrShort()` | ₹71.4L · ₹1.79 Cr · ₹32k |
| Per-fund SIP amounts | Nearest ₹100, remainder to the largest fund | ₹11,400 |
| Percentages | Whole numbers on display | 34% |
| Negative amounts | A real minus sign (U+2212), not a hyphen | −₹8,000 |
| Months | Short month and year | Apr 2027 |
| Differences | Always signed | +₹12k vs plan |

Amounts are right-aligned in tables. Totals sit under a solid rule.

## Words

- **Plain words over jargon.** "Free to allocate", "Move to debt", "Fixed investments". When a finance term is unavoidable, it gets a dotted underline and a tooltip from the [glossary](../01-product/glossary.md).
- **Say what happens, not what the system did.** "Plan saved. Every page now uses it." not "Update successful".
- **Errors say what to do.** "Enter a month like 2027-06" not "Invalid input".
- **No advice.** The app states the consequences of the user's own assumptions. It never says "you should invest in…". General tips are labelled "Tip" and phrased as information. Hardcoded product guidance (today: "Direct plan, Growth option") moves to an optional, dismissible tip.
- **Projections are estimates.** Pages with forward-looking numbers carry a short line: "Projections use your assumptions. They're estimates, not guarantees."
- **No personal or brand names** in UI copy (no policy, insurer or place names). They come from the user's plan.

## Layout

- Maximum content width 1080 px, 16 px side gutter on phones.
- Cards: 10 px radius, 1 px `line` border, `surface` background.
- Two-column layouts on large screens (`lg:`) collapse to one column below 1024 px.
- Data tables scroll sideways inside their card on narrow screens; the page itself never scrolls sideways.
- The editor's save bar is sticky so Save is always reachable.

## Interaction

- **Primary action:** one per view, filled with the accent colour.
- **Destructive actions** (delete log, remove scenario, delete account) need confirmation; deleting the account also requires typing "delete".
- **Pending states:** the button text changes ("Saving…") and the button is disabled. Nothing else moves.
- **Forms** keep their input after an error. Focus moves to the first field with an error.

## Accessibility (WCAG 2.2 AA)

- Every input has a visible `<label>`. Placeholders are examples, never labels.
- Focus is always visible (2 px accent outline).
- Status changes (saved, error) are announced with `aria-live="polite"`.
- The chart has a text alternative: a summary sentence and a "Show as table" toggle.
- Touch targets are at least 24 × 24 px (44 px for primary buttons on phones).
- Text contrast is at least 4.5:1 in both themes, checked with the tokens.
