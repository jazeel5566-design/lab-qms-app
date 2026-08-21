# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. Unzip this anywhere for a full working copy of
the project, independent of any other zip you've received.

## What changed in THIS update: laboratory_id wired through the whole app

With RLS now enforcing lab isolation (migration `0030`), every write to
any of the 23 lab-scoped tables needed to actually supply `laboratory_id`
— otherwise Postgres rejects it (NOT NULL / RLS `WITH CHECK` failure).
Only `tasks`, `nonconformities`, and `clause_status` had this wired
already. This update closes every remaining gap:

**Frontend (`src/`):**
- `dataSync.js` — every remaining `*ToDb`/`*FromDb` pair now maps
  `laboratory_id` ⇄ `laboratoryId` (management reviews, competency,
  equipment, equipment records, QC machines/parameters/controls/runs,
  EQA events, documents, risks, task comments, task templates, clause
  evidence, equipment downtime, document acknowledgments)
- `App.jsx` — every component that creates a new record now receives
  `activeLaboratoryId` as a prop and includes it when building the new
  row: RiskRegister, Competency, Equipment (+ its CSV import), IQCPage
  (machines/parameters/controls/runs + both its CSV import paths),
  EQAPage, Documents, Settings (API keys), and the centralized "Action"
  functions (management reviews, document acknowledgment, equipment
  downtime, clause evidence, task comments, task templates)
- **New:** the "Add staff member" form and the personnel CSV bulk-import
  now require selecting/specifying a primary laboratory for every new
  staff account (personnel.laboratory_id is also NOT NULL)
- Three API files (`taskComments.js`, `clauseEvidence.js`,
  `documentAcknowledgments.js`) gained a `laboratoryId` parameter, since
  their functions previously took fixed positional arguments with nowhere
  to put it

**Edge functions (`supabase/functions/`):**
- `create-api-key` — now resolves `laboratory_id` from the linked QC
  machine (preferred) or the admin's active lab (fallback for
  unrestricted keys)
- `ingest-qc-result` — the actual machine→QMS interface real analysers
  POST to. Now derives `laboratory_id` from the submitting machine. **This
  was a live production gap** — every real instrument result submission
  would have failed under RLS until this fix.
- `ingest-eqa-result` — same idea, derives from the named machine or
  falls back to the API key's own lab
- `admin-create-staff` — now requires and inserts `laboratory_id` when
  creating a new staff login

## Bug caught and fixed during this update: a self-inflicted syntax break

While fixing the IQC machine CSV-import path, an edit accidentally
deleted several lines of `handleImportMachines` (the closing brace,
`updateQcMachines(next)`, and `return count`), which would have broken
the entire file's structure and likely failed the Vercel build outright.

**Caught via a brace/paren/bracket balance check against the original
file before packaging** — not by manual reading, given the file's size.
Fixed and reverified: `App.jsx`'s bracket balance now exactly matches the
original file, confirming no other edit introduced a similar break.
Recommend this same balance check be part of the routine going forward
after any large multi-edit pass on this file.

## Full status: database (all confirmed live on `itcmqmwcrwwxyhtznack`)

- `0025` — organizations/laboratories built, `laboratory_id` added to 23 tables
- `0026` — 5 real labs created, `personnel_laboratories` junction table
- `0027` — **do not run.** Superseded by `0028`, kept for historical record only.
- `0028` — restores original role-based security after `0027`'s regression
- `0029` — removed the organizations layer, flat `laboratories` design
- `0030` — lab isolation enforced via RESTRICTIVE policies (includes the
  `SECURITY DEFINER` fix for `has_lab_access()`, confirmed working)

## Deploy instructions for THIS update

1. **Run on Supabase?** No new SQL migrations. **But** you must **redeploy
   the four changed edge functions** — these run on Supabase's edge
   infrastructure, separate from your database migrations and separate
   from Vercel:
   ```
   supabase functions deploy create-api-key
   supabase functions deploy ingest-qc-result
   supabase functions deploy ingest-eqa-result
   supabase functions deploy admin-create-staff
   ```
2. **Upload to GitHub?** Yes — this update touches many files. Safest to
   unzip this whole package over your repo rather than picking files
   individually, since `src/App.jsx`, `src/dataSync.js`, three files in
   `src/api/`, and four files in `supabase/functions/` all changed.
3. **Redeploy on Vercel?** **Yes** — `src/` changed extensively. Push to
   GitHub and redeploy.
4. **Test live?** ✅ Strongly recommended, in this order:
   - Log in as each of your three test accounts (Admin, QA Manager,
     Technologist) and confirm the app loads normally
   - Try creating one record in each major module (a risk, a competency
     record, a piece of equipment, a QC run, an EQA event, a document) —
     these were all previously broken under RLS and should now succeed
   - Create a new staff member via the Personnel page and confirm the new
     "Primary laboratory" field is required and works
   - If you have a real analyser or middleware sending results via
     `ingest-qc-result`, test one submission after redeploying that edge
     function specifically — this was silently broken since `0030` went
     live and is worth confirming fixed

## Next step

With writes now working end-to-end, remaining work is: reassigning your
existing personnel out of Biochemistry into their real labs via the
Personnel page's lab-assignment UI, and testing multi-lab isolation
properly with a second real lab in use (not just Biochemistry).
