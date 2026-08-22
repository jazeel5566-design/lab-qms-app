# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. Unzip this anywhere for a full working copy of
the project, independent of any other zip you've received.

## What changed in THIS update: EQAS discipline options + sample tracking

Two related fixes to the EQAS (External Quality Assessment) module:

**1. Discipline now shows all real laboratories, not a fixed 3-item list.**
EQA's discipline dropdown was hardcoded to `["Hematology", "Biochemistry",
"Immunochemistry"]` — left over from before labs existed. It now pulls
from your actual `laboratories` table (Biochemistry, Hematology, Clinical
Pathology, Infectious Serology, Microbiology, and any future lab created
via Settings). The database's `eqa_events.discipline` column also had a
hard `CHECK` constraint limiting it to those same 3 values — dropped in
migration `0032`, since a fixed list would go stale every time a new lab
is created. **Note:** `qc_machines.discipline` still uses the original
fixed 3-value list — that wasn't part of what you asked for, so it's
untouched. Let me know if that should change too.

**2. Sample number tracking added.** EQA cycles typically involve 12
samples per round, but there was no way to record which sample a result
belonged to. Added a `sample_number` column (nullable, so existing data
stays valid) and corresponding form fields:
- Single-entry mode: an optional "Sample #" field
- Batch-entry mode: each row now has its own Sample # field, plus a new
  **"Fill 12 samples (same analyte)"** shortcut button that pre-fills 12
  rows numbered 1–12 for one analyte, ready to fill in results quickly
- The results list now shows a "Sample N" tag when a result has one

**Also fixed:** the `ingest-eqa-result` edge function (the machine/
middleware submission interface) had the same hardcoded 3-discipline
check — removed, and it now also accepts an optional `sampleNumber`
field. A missing `Copy` icon import was caught and fixed before packaging
(would have broken the build).

## Full history of today's work

**Database (`0025`–`0032`):** organizations/labs built, 5 real labs
created, lab isolation enforced via RLS (with a caught-and-remediated
regression at `0027`→`0028`), self-service email updates (`0031`), and
now dynamic EQA disciplines + sample tracking (`0032`).

**Write/read side:** every table's create/list path correctly scopes by
`laboratory_id`.

**Admin tooling:** create labs, create/reassign staff, multi-lab access,
restricted staff visibility (Admin/QA Manager see all, others self-service
only).

**Process note:** a brace/paren/bracket balance check against the
original file is standard after any multi-edit pass — caught a real
self-inflicted syntax break earlier today, and caught the missing `Copy`
import in this update, both before reaching production.

## Full status: database (all confirmed live on `itcmqmwcrwwxyhtznack`)

- `0025`–`0026` — organization/lab foundation, multi-lab access
- `0027` — **do not run.** Superseded by `0028`.
- `0028`–`0030` — security regression fixed, orgs flattened, lab isolation enforced
- `0031` — self-service email update RPC
- `0032` — EQA discipline check dropped, `sample_number` column added

## Deploy instructions for THIS update

1. **Run on Supabase?** Already done — `0032` was run and confirmed
   during this session.
2. **Upload to GitHub?** Yes — `src/App.jsx`, `src/dataSync.js`,
   `supabase/functions/ingest-eqa-result/index.ts`, and
   `supabase/migrations/0032_eqa_dynamic_discipline_and_samples.sql`.
3. **Redeploy on Vercel?** Yes — `src/` changed.
4. **Redeploy the edge function?** Yes, if you use the machine ingestion
   interface: `supabase functions deploy ingest-eqa-result`
5. **Test live?** Go to EQAS → Log EQA result. Confirm the Discipline
   dropdown shows all 5 labs. Try batch mode, click "Fill 12 samples,"
   confirm it populates 12 numbered rows, fill in a couple of results,
   and save — confirm the sample numbers show up correctly in the results
   list afterward.

## Next step

Reassign your existing personnel out of Biochemistry into their correct
labs via the Personnel page, then do a full walkthrough as a Technologist
in one lab and confirm they only ever see that lab's data anywhere in the
app.





