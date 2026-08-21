# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. Unzip this anywhere for a full working copy of
the project, independent of any other zip you've received.

## What changed in THIS update: reads now actually filter by the ACTIVE lab

This is a significant fix. Previously, only `clause_status`, `tasks`, and
`nonconformities` were fetched filtered to the currently-selected lab.
Every other module — competency, equipment, equipment records, QC
machines/parameters/controls/runs, EQA events, documents, risks,
management reviews, document acknowledgments, equipment downtime, clause
evidence, task comments, task templates — relied purely on RLS, which
restricts by *every lab a user can access*, not the *one lab they
currently have selected*.

**Practical effect before this fix:** RLS was working correctly (no
security gap), but for anyone with access to more than one lab — every
Admin, and any QA Manager–style multi-lab user — every one of those
modules would silently show **all their labs' data mixed together**,
regardless of which lab was selected in the lab switcher. A Technologist
with only one lab wouldn't have noticed, but an Admin switching to
"Hematology" would still see Biochemistry's equipment, QC runs, documents,
etc. sitting right alongside it.

**Fixed:** 11 API files (`operations.js`, `qc.js`, `eqaAndDocuments.js`,
`risks.js`, `managementReviews.js`, `documentAcknowledgments.js`,
`equipmentDowntime.js`, `clauseEvidence.js`, `taskComments.js`,
`taskTemplates.js`) — every `list*` function now accepts an optional
`laboratoryId` parameter and filters with `.eq("laboratory_id", ...)`
when provided. `App.jsx`'s `loadLabScopedData()` — the single function
that loads everything after login or a lab switch — now passes the
active lab's ID through to all of them, closing the gap completely.

`notification_settings` was deliberately left unfiltered — it holds
global on/off toggles for email notification types (e.g. "task overdue"),
which is an Admin-only, system-wide setting rather than per-lab
operational data.

## Full history of today's laboratory_id work

**Database (`0025`–`0030`):** organizations/labs built, 5 real labs
created, lab isolation enforced via RLS (with a caught-and-remediated
regression at `0027`→`0028`, and a `SECURITY DEFINER` fix in `0030`).

**Write side:** every create/insert path across the app and 4 edge
functions correctly supplies `laboratory_id`.

**Read side (this update):** every list/fetch now correctly filters by
the active lab, not just whatever RLS happens to allow through.

**Admin tooling:** create labs, create staff with a required primary lab,
reassign anyone's primary lab afterward, grant multi-lab access — plus a
layout fix on the Personnel page.

**Process note:** a brace/paren/bracket balance check against the
original file is now standard after any multi-edit pass — it caught one
real self-inflicted syntax break earlier today before it reached
production.

## Full status: database (all confirmed live on `itcmqmwcrwwxyhtznack`)

- `0025` — organizations/laboratories built, `laboratory_id` added to 23 tables
- `0026` — 5 real labs created, `personnel_laboratories` junction table
- `0027` — **do not run.** Superseded by `0028`, kept for historical record only.
- `0028` — restores original role-based security after `0027`'s regression
- `0029` — removed the organizations layer, flat `laboratories` design
- `0030` — lab isolation enforced via RESTRICTIVE policies (includes the
  `SECURITY DEFINER` fix for `has_lab_access()`, confirmed working)

## Deploy instructions for THIS update

1. **Run on Supabase?** No — no database changes.
2. **Upload to GitHub?** Yes — `src/App.jsx` plus 10 files in `src/api/`
   (`operations.js`, `qc.js`, `eqaAndDocuments.js`, `risks.js`,
   `managementReviews.js`, `documentAcknowledgments.js`,
   `equipmentDowntime.js`, `clauseEvidence.js`, `taskComments.js`,
   `taskTemplates.js`). Safest to unzip the whole package over your repo.
3. **Redeploy on Vercel?** Yes — `src/` changed.
4. **Test live?** ✅ Important this time — log in as **Admin** specifically
   (the account that can see all 5 labs), switch between labs using the
   lab switcher, and confirm Equipment, QC, Documents, Risks, EQA, and
   Competency each show *only* the currently selected lab's data — not
   everything mixed together. This is the actual bug this update fixes,
   so it's worth verifying directly rather than assuming.

## Next step

Reassign your existing personnel out of Biochemistry into their correct
labs via the Personnel page, then do a full walkthrough as a Technologist
in one lab and confirm they only ever see that lab's data anywhere in the
app.



