# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. Unzip this anywhere for a full working copy of
the project, independent of any other zip you've received.

## What changed in THIS update: EQAS cycle summary + run/due dates

Following research into how real EQA/PT schemes work (RIQAS, UK NEQAS,
CAP, etc.), three things were added:

**1. Sample run date and submission due date.** Previously the form only
had one date ("date result received"). Real EQA workflow has three
distinct dates per sample: when the lab actually tested it (**run
date**), the provider's submission deadline (**due date**), and when the
provider's report came back (**date received**, unchanged). All three are
now per-row fields — important because a monthly-annual cycle's 12
samples each have their own dates spread across the year, not one shared
date for the whole cycle.

**2. A "Cycle summary" view.** EQA providers report performance at the
cycle level, not just per-sample — a running average deviation and an
end-of-cycle summary. The new "Show cycle summary" button groups results
by discipline + provider + cycle, showing sample count, average |SDI|,
a breakdown of Satisfactory/Marginal/Unsatisfactory/pending counts, and
an **overdue submission count**. Click a cycle to expand it and see every
sample's run date, due date, received date, and SDI individually.

**3. Overdue submission indicators.** Both the flat results list and the
cycle summary now flag in red when a sample's due date has passed and no
result has been received yet ("Submission overdue").

**Database (`0033`):** added `run_date` and `due_date` columns to
`eqa_events`.

**Also updated:** the "Fill 12 samples" batch-entry rows now include run
date/due date/received date per row (previously batch mode had no dates
at all beyond the shared header); `ingest-eqa-result` edge function
accepts the new fields for machine-submitted results.

## Full history of today's work

**Database (`0025`–`0033`):** organizations/labs built, 5 real labs
created, lab isolation enforced via RLS (with a caught-and-remediated
regression at `0027`→`0028`), self-service email updates (`0031`),
dynamic EQA disciplines + sample tracking (`0032`), and now run/due dates
+ cycle summary (`0033`).

**Write/read side:** every table's create/list path correctly scopes by
`laboratory_id`.

**Admin tooling:** create labs, create/reassign staff, multi-lab access,
restricted staff visibility.

**Process note:** a brace/paren/bracket balance check against the
original file is standard after any multi-edit pass — it caught a real
duplicated code block introduced while rewriting the EQA form in this
very update, before it reached you.

## Full status: database (all confirmed live on `itcmqmwcrwwxyhtznack`)

- `0025`–`0026` — organization/lab foundation, multi-lab access
- `0027` — **do not run.** Superseded by `0028`.
- `0028`–`0030` — security regression fixed, orgs flattened, lab isolation enforced
- `0031` — self-service email update RPC
- `0032` — EQA discipline check dropped, `sample_number` column added
- `0033` — `run_date` and `due_date` columns added to `eqa_events`

## Deploy instructions for THIS update

1. **Run on Supabase?** Already done — `0033` was run and confirmed
   during this session.
2. **Upload to GitHub?** Yes — `src/App.jsx`, `src/dataSync.js`,
   `supabase/functions/ingest-eqa-result/index.ts`, and
   `supabase/migrations/0033_eqa_run_due_dates.sql`.
3. **Redeploy on Vercel?** Yes — `src/` changed.
4. **Redeploy the edge function?** Yes, if you use the machine ingestion
   interface: `supabase functions deploy ingest-eqa-result`
5. **Test live?** Go to EQAS → Log EQA result → batch mode → "Fill 12
   samples" → confirm each of the 12 rows has its own Run date/Due
   date/Received date fields. Save a few with a due date in the past and
   no result → go to "Show cycle summary" → confirm that cycle shows an
   "overdue" badge and the correct Satisfactory/Marginal/Unsatisfactory/
   pending breakdown.

## Next step

Reassign your existing personnel out of Biochemistry into their correct
labs via the Personnel page, then do a full walkthrough as a Technologist
in one lab and confirm they only ever see that lab's data anywhere in the
app.






