# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. Unzip this anywhere for a full working copy of
the project, independent of any other zip you've received.

## What changed in THIS update: admins can now reassign a person's primary lab

Previously, a staff member's primary lab (`personnel.laboratory_id`) could
only be set once, at account creation. There was no way to change it
afterward — only the *extra* multi-lab assignments (`personnel_laboratories`,
for people like a QA Manager) had an edit UI. This blocks the basic "admin
has full authority to assign someone to a laboratory" requirement.

**Fixed:**
- `dataSync.js` — `personnelToDb()` now maps `laboratoryId` → `laboratory_id`,
  so changes actually save (previously silently dropped even if the UI had
  let you attempt it)
- `App.jsx` — the Personnel page's admin row editor now has a "Primary
  laboratory" dropdown next to the existing role dropdown, using the exact
  same edit/save pattern already used for job title, email, and access role

No database changes — `personnel.laboratory_id` already existed and was
already writable; the app just never exposed a way to edit it after
creation.

## Full history of today's laboratory_id rollout

**Frontend (`src/`):** every `*ToDb`/`*FromDb` pair in `dataSync.js` now
carries `laboratory_id`; every record-creating component in `App.jsx`
(RiskRegister, Competency, Equipment, IQCPage, EQAPage, Documents,
Settings, Personnel, plus the centralized "Action" functions) includes
`activeLaboratoryId` when building new rows.

**Edge functions (`supabase/functions/`):** `create-api-key`,
`ingest-qc-result` (the real machine→QMS interface), `ingest-eqa-result`,
and `admin-create-staff` all now correctly resolve and insert
`laboratory_id`.

**A bug was caught and fixed mid-session:** an earlier edit accidentally
deleted several lines of `handleImportMachines`, which would have broken
the Vercel build. Caught via a brace/paren/bracket balance check against
the original file before packaging — now part of the standard process
after any large multi-edit pass on `App.jsx`. Re-verified balanced again
after this update's additional edits.

## Full status: database (all confirmed live on `itcmqmwcrwwxyhtznack`)

- `0025` — organizations/laboratories built, `laboratory_id` added to 23 tables
- `0026` — 5 real labs created, `personnel_laboratories` junction table
- `0027` — **do not run.** Superseded by `0028`, kept for historical record only.
- `0028` — restores original role-based security after `0027`'s regression
- `0029` — removed the organizations layer, flat `laboratories` design
- `0030` — lab isolation enforced via RESTRICTIVE policies (includes the
  `SECURITY DEFINER` fix for `has_lab_access()`, confirmed working)

## Deploy instructions for THIS update

1. **Run on Supabase?** No — no database changes in this update.
2. **Redeploy edge functions?** Only if you haven't already deployed the
   previous update's four edge function changes (`create-api-key`,
   `ingest-qc-result`, `ingest-eqa-result`, `admin-create-staff`) — this
   update doesn't touch them further.
3. **Upload to GitHub?** Yes — `src/App.jsx` and `src/dataSync.js` changed.
4. **Redeploy on Vercel?** Yes — `src/` changed.
5. **Test live?** Log in as Admin, go to Personnel, and confirm you can
   change an existing staff member's "Primary laboratory" dropdown and
   save it successfully.

## Next step

The remaining real-world task: use this new dropdown to actually reassign
your existing personnel out of Biochemistry into their correct labs
(Hematology, Clinical Pathology, Infectious Serology, Microbiology), then
test multi-lab isolation with genuinely different lab assignments in
place — not just everyone still defaulted to one lab.

