# Open questions

Decisions needed before Phase 1.1 work started (milestone M0). On 13 Oct 2026 the owner delegated these decisions to the project lead, and every recommended default was adopted (status **Agreed**). The related ADRs are `Accepted`.

| ID | Question | Recommended default | Blocks | Status |
| --- | --- | --- | --- | --- |
| Q-1 | Who is the product for over the next 12 months: only you, or invited users too? | **Only you**, but keep the design multi-user-safe (no hardcoded data, strict scoping). Invitations, privacy notice and DPDP work happen only when the first invite is planned | Scope of ACC-*, NFR-PRV-4 | Agreed |
| Q-2 | Accept the engine v2 behaviour changes: carried shortfall, step-ups from the item's own start, goal completion? | **Yes.** They make the numbers more honest. Your projections will change slightly where those cases apply | M2, ADR-0008 | Agreed |
| Q-3 | Should a carried shortfall cost interest (as on a credit card)? | **No interest in v2.** Show the amount owed and when it's repaid. Revisit if shortfalls turn out to be common | ENG-2 | Agreed |
| Q-4 | At the house target date: if the fund is enough, simulate the purchase automatically (EMI starts, rent ends)? If it's short, what then? | **Yes, automatically** when affordable. **If short**, don't buy: the goal holds, the card says "Short by ₹X", and you can move the date in a scenario | ENG-4 | Agreed |
| Q-5 | Emergency fund target: fixed amount or months of expenses? | **Keep your existing plan on a fixed amount**; new blank plans default to **6 months of expenses** | ENG-5, SET-1 | Agreed |
| Q-6 | Should a fixed investment linked to the house goal (such as a policy) count toward the house upfront cash? | **No** (same as today). Insurance-linked policies usually mature later or can't be withdrawn early. They still show on the goal card | House outlook | Agreed |
| Q-7 | Tracking baseline: the plan's first revision, or the plan as it was when you logged your first month? | **First revision**, with a "Use current plan as baseline" button for each yearly review | TRK-3, ADR-0007 | Agreed |
| Q-8 | Existing scenarios: convert them to levers automatically, or delete and recreate? | **Convert** with a script; list any that can't be converted | WIF-3, ADR-0006 | Agreed |
| Q-9 | Hosting: Vercel + Neon, or Azure (mentioned in the brief)? | **Vercel Hobby + Neon** in or near Mumbai. Free, zero-config for Next.js. Revisit if the app becomes commercial (the Hobby plan is non-commercial) | Operations | Agreed |
| Q-10 | The GitHub repo is public. Keep it public (portfolio value) or make it private? | **Public**, with the fictional-data rule. Make it private if you ever want to keep real configuration or notes in it | Data rule | Agreed |
| Q-11 | Should general guidance on This month (such as "Set SIPs 2–3 days after salary day") stay? | **Yes, as a dismissible "Tip"**, phrased as information, never advice. Product-specific text ("Direct plan, Growth option") is removed | DSH-3, G-21 | Agreed |
| Q-12 | When the current month passes the horizon, extend automatically? | **No.** Show a banner offering to extend by 5 or 10 years, which saves a revision | Edge case in engine spec §6 | Agreed |
| Q-13 | Do you need the app on your phone soon, ahead of Phase 2's PWA? | **No.** The responsive web app works on a phone browser; the PWA stays in Phase 2 | AUT-5 timing | Agreed |

