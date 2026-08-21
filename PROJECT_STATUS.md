# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. Unzip this anywhere for a full working copy of
the project, independent of any other zip you've received.

## What changed in THIS update: frontend bug fix (not a database change)

After `0030` went live, logging in as QA Manager/Technologist succeeded,
but the app then showed **"No laboratory assigned"** — even though both
accounts do have a lab.

**Root cause:** the frontend already had a fully-built lab-switcher
(`activeLaboratoryId`, `<LaboratoryPicker>`, etc.) from earlier work, but
its "which labs can this user access" logic only checked the
`personnel_laboratories` table (extra labs). It never checked a user's
**primary** lab, stored directly on `personnel.laboratory_id`. Since
today's design keeps primary and extra labs separate (per your instruction
— primary lab doesn't get duplicated into `personnel_laboratories`), any
user with only a primary lab and no extra assignments saw zero
accessible labs.

**Two files fixed:**
- `src/dataSync.js` — `personnelFromDb()` now maps `laboratory_id` into
  `laboratoryId`, so the frontend can actually see a user's primary lab
  (it was being silently dropped before)
- `src/App.jsx` — the accessible-labs calculation now includes
  `lab.id === myPersonnel?.laboratoryId` alongside the existing
  `personnel_laboratories` check

No other files were touched. No database changes in this update — purely
a frontend logic fix.

## Full status: database (all confirmed live on `itcmqmwcrwwxyhtznack`)

- `0025` — organizations/laboratories built, `laboratory_id` added to 23 tables
- `0026` — 5 real labs created, `personnel_laboratories` junction table
- `0027` — **do not run.** Superseded by `0028`, kept for historical record only.
- `0028` — restores original role-based security after `0027`'s regression
- `0029` — removed the organizations layer, flat `laboratories` design
- `0030` — lab isolation enforced via RESTRICTIVE policies (includes the
  `SECURITY DEFINER` fix for `has_lab_access()`, confirmed working)

## Deploy instructions for THIS update

1. **Run on Supabase?** No — this update is frontend-only. Nothing new to
   run against the database.
2. **Upload to GitHub?** Yes — two files changed:
   - `src/dataSync.js`
   - `src/App.jsx`
   You can either replace these two files directly, or unzip this whole
   package over your repo (safe either way, since the rest is unchanged).
3. **Redeploy on Vercel?** **Yes** — this is the first update today that
   touches `src/`, so Vercel needs to rebuild. Push to GitHub and either
   let auto-deploy trigger, or manually redeploy from the Vercel dashboard.
4. **Test live?** ✅ Recommended: log in as QA Manager and Technologist
   again. They should now land directly in the app (single lab, no picker
   needed) rather than seeing "No laboratory assigned."

## Next step

With login and lab access now working end-to-end, the remaining piece is
wiring `laboratory_id` into the app's various `create*` calls that don't
yet pass it (task creation and NC creation already do, per the existing
code — worth confirming the rest: QC runs, equipment, documents, risks,
etc.) so writes succeed cleanly under the now-enforced RLS.
