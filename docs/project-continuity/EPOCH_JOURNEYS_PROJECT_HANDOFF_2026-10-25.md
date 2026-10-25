# EPOCH JOURNEYS — PROJECT CONTINUITY & HANDOFF

**As of:** 25 October 2026  
**Purpose:** Preserve settled architecture, confirmed test results, and the next task when ChatGPT conversations reach their length limit.  
**Scope:** Quotation Module and directly related Supplier CRM, hotel costing, expense catalogues, PDF, and workflow.  
**Authority:** This file records decisions from previous discussions. **The current repository files and database schema are the source of truth for the implementation.** Never assume an older patch still matches local code.

## 1. Project and safe working method

- Project: **Epoch Journeys**, a B2B tour-operator/pilgrimage quotation and management application.
- Local Windows repository: `C:\Users\emrev\epoch-journeys`.
- Stack reported: Next.js 16.3.0 (`--webpack`), React/TypeScript, Prisma and PostgreSQL (Neon).
- The user prefers **complete updated source files**, not partial snippets, ideally in a ZIP with a **safe installer**, file-version checks, backup, and README.
- Work incrementally; never overwrite newer user edits. Ask for / review the **current affected project files** before preparing edits. Do not blindly reuse old ZIP patches.
- Before any release, test focused helpers, run `npx tsc --noEmit --pretty false` and `npm run build` on the user's local system, and verify the actual user interface and generated PDFs. A successful build does not prove financial correctness.
- Preserve Supplier CRM data, Supplier Payables, invoices, accounting, payments, COMP allocation and the existing NET / selling-price engine unless a proven defect warrants a targeted, tested correction.
- Do not reset, migrate destructively, or recreate the Neon database. Do not request or include `.env` secrets in shared ZIPs or handoff material.

## 2. Settled costing architecture — DON'T REDESIGN

### Accommodation
- **Hotel module:** Hotel stays, nights, room occupancy rates, BB/HB, included services, city taxes, and **optional hotel-supplied Dinner, Drinks, Porterage only where the selected real hotel's Supplier CRM has a usable price**.
- **Standard Per-Person Services:** Independently purchased restaurant dinners/lunches, drinks, water, headsets, porterage, tips, tickets etc., sourced from Epoch standards, real Supplier CRM, or manual entry.
- Example: Sofia BB hotel contract may offer dinner at **€40 per meal**; a restaurant dinner can instead cost **€35**. These are distinct choices. If hotel dinner is not selected, it must not be charged. An HB dinner included in a room rate is not charged again.
- **City tax:** Shown explicitly for auditing and charged only once. A previous Sofia test displayed effective Double/Twin **€85/person/night = €80 accommodation + €5 city tax**; don't add an extra €5 on top of the effective cost if it is already included. Confirm actual saved basis before changing calculations.
- Single and Triple rates should **not** be obligatory if those occupancies are unused. Required room rates for actual priest/group-leader/staff and other COMPs must be present or specifically resolved; never invent them.
- Keep core hotel stays distinct from pre/post optional stays. Verify supplier rate basis (per room vs per person) before interpreting prices.

### Per-person costs and COMPs
- **One unified per-person cost picker** with source choices: Attractions catalogue, Epoch standard prices, genuine Supplier CRM rates, Manual entry. All create rows in one cost table; don't reintroduce duplicate entry panels.
- Catalogue prices copied as **snapshots** into quotes; future master price updates must not retroactively change saved quotes.
- **Attractions** have one admission per traveler unless a genuinely separate visit; no invented supplier record.
- **Lunch/Dinner quantities:** Quantity counts actual meals, not tour duration; per-person rate × quantity. The tested duplicate warning prevents accidental duplicate entries while permitting deliberate exceptions.
- **Final agreed standard meal limits:** `Maximum paid dinners = total actual core hotel nights`; `Maximum lunches = max(0, total actual core hotel nights - 1)`. BB/HB does **not** lower the maximum dinner selector. Included HB dinners must not be charged again; flag overlapping dinners for review. Hotel-purchased and restaurant-purchased dinners together count against the maximum. Dates are only an independent plausibility check for hotel-night count, not the calculation basis. Blank default hotel rows must not establish meal limits. These rules are for the current standard tour; unusual schedules may require a clearly flagged exception.
- Example: **7 real hotel nights** -> maximum **6 lunches, 7 dinners**, even if the advertised departure date includes a Day-1 overnight USA flight.
- Water/headsets may be day-based; private group bus/charter and fixed church fees are **group operations**, not per-person; ferry/flight/entrance tickets are per person.
- COMPs consume applicable hotel and per-person services and are recovered **once** across paying passengers; do **not** double-add fixed group operations for COMPs. COMP room type requirements depend on actual occupancy.
- **Group leader allowance is a cost per PAYING traveler**, independent of tour duration (e.g., €150/payer means €3,000 for 20 payers), and separate from the leader's personal COMP costs.

### Financial summary
- Group Financial Summary is a **read-only presentation and reconciliation of the EXISTING quotation calculation**, not a second pricing engine.
- Show paying / COMP / total travelers, paying-traveler accommodation, per-person costs, fixed group operations/staff, group-leader allowance, COMP cost, total group cost, expected revenue, projected profit / margin.
- Internal PDF can expose all costs; agency-facing/agent PDFs must not disclose supplier costs/profit.
- Earlier test PDF totals reconciled numerically; this does **not** guarantee every supplier price or room rate was actually present.

## 3. Verified work and unresolved items

### Confirmed by user or observed
- Standard services categories include Drinks; missing TS category issue resolved and builds succeeded.
- Conditional hotel services / city-tax work has been installed and compiled; maintain source separation rather than removing all hotel extras.
- Lunch validation and duplicate warning were **tested by user**: 6 lunches prompted a warning on a 6-night itinerary, 5 lunches worked; PDF showed one Lunch row with quantity 5, not two rows.
- Hotel-night-based meal limits were installed and user reported **'Great working'**.
- Group Financial Summary added to form + Internal Costing PDF; previous PDFs' arithmetic reconciled.
- `complimentaryCosts.ts` missing helper was restored; builds then succeeded.
- The Approval Readiness endpoint initially returned HTML/JSON parse error; repaired; the user subsequently received meaningful blockers and warnings for saved drafts.
- User uses a custom Windows `npm run dev` single-instance launcher and has seen 'Epoch Journeys is already running or starting'. Existing server may be at `http://localhost:3000`.

### Most recent package — NOT YET USER-VERIFIED
- Prepared **`Epoch_Quote_Workflow_Simple_Delete_25Oct2026.zip`**: simplified Quotes list to **View / Edit Draft / Duplicate / Delete** for draft quotes; lifecycle actions moved to Quote Details; backend workflow protections tightened; draft deletion requires confirmation; converted/commercial quotes protected. A guarded installer was supplied.
- **No build result or user functional test has been reported for this specific latest package yet.** Start by establishing whether the ZIP has been installed, whether `tsc` + build pass, and whether list/details/delete behave as specified. Do not assume it is done.

### Outstanding targeted work / verification
1. **Verify latest simplified quotation workflow** after installation: draft delete confirmation and cancellation, protection against deleting other statuses, list vs Quote Details actions, status API enforcement. Create a disposable draft and delete it only with explicit confirmation.
2. **Refine Approval Readiness policy**: recipient email should be required before email sending, not necessarily internal finalization; this distinction was recommended but **not yet confirmed implemented**. Eliminate false hotel dinner warning when service wasn't selected; consolidate duplicate COMP warnings. Maintain required room rates for actual occupancies and reconciliation blockers.
3. **Refine Internal Costing PDF presentation**: hide needless zero-cost Bus/Coach rows, fix misleading 'selected hotel dinner ×1 €0' wording when unchecked, ensure line item vs saved accommodation totals reconcile, page breaks and tax breakdown. Verify against current saved snapshot before declaring a pricing bug.
4. **Full end-to-end financial test** with a realistically costed quote, paying/COMP/staff, BB/HB, optional hotel vs restaurant meals, city tax, hotel-night validation, selling rate, save/reopen, PDF, readiness check, finalize, send, approve, convert.
5. Finalize only after appropriate validation. Drafts always remain savable even with missing data. Do not allow direct status shortcuts to bypass server-side checks.

## 4. Previous Approval Readiness diagnostic (TEST DATA, not a universal issue)

The check for one draft returned 3 blockers: recipient email missing, HOTEL REGINA Single rate missing for a PRIEST, and HOTEL REGINA Single rate missing for a GROUP_LEADER. Warnings: missing dates, HOTEL REGINA rate reconfirmation, an apparently unitemized hotel dinner, and an overlapping generic COMP accommodation warning. The user clarified that the Sofia contracted €40 dinner had **not** been ticked in another test, and that an HB Fatima dinner was included. Treat warnings case-by-case; don't fabricate a hotel dinner cost or rate.

## 5. How to continue in a new ChatGPT conversation

1. Open the new chat **inside the same EPOCH JOURNEYS Project**.
2. Attach this file as a Project reference (or upload it to the new chat), plus the **latest affected source files / sanitized repository ZIP** when code changes are required.
3. Paste the following prompt:

> Continue development of Epoch Journeys from the attached PROJECT CONTINUITY & HANDOFF file. Preserve all settled architecture and verified behavior. The last prepared update was `Epoch_Quote_Workflow_Simple_Delete_25Oct2026.zip` (build and installation not yet confirmed). First establish the actual current local source version and whether the update was installed; do not start redesigning modules. Our next tasks are to verify the simplified quotation workflow and protected Delete action, then refine Approval Readiness and Internal Costing PDF. Provide full modified files and a guarded ZIP installer; never disturb existing supplier, financial or COMP logic.

4. Keep the continuity file current after every accepted change: **date, ZIP/source version, install result, build result, user-tested behavior, remaining issue**.
5. Prefer committing successful checkpoints in a private Git repository with appropriate `.gitignore` and no `.env` secrets. Chat conversation memory is a useful guide, but version-controlled source is the authoritative record.

## 6. Checkpoint log template

| Date | Change / patch | Installed? | `tsc`/build | Verified behavior | Remaining issue |
|---|---|---|---|---|---|
| 2026-10-25 | Hotel-night meal limits | Yes, user confirmed | User said working | Lunches = hotel nights - 1; dinners = nights | Full workflow test pending |
| 2026-10-25 | Approval Readiness JSON repair | Yes, endpoint functioning | Full build not separately recorded here | Actual blocker/warning list displayed | Refine policy/warnings |
| 2026-10-25 | Simplified list + draft Delete | **Not confirmed** | **Not confirmed** | **Not confirmed** | Install and test first |

**End of handoff.**
