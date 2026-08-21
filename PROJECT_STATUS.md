# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. You can unzip this anywhere and have a full
working copy of the project, independent of any other zip you've received.

**Every update from here on is packaged this way — a full project
snapshot, not just the new files — so any single zip you have is a
complete restore point on its own.**

## What's confirmed applied to production (Supabase project `itcmqmwcrwwxyhtznack`)

- `0025_laboratory_separation.sql` — organizations/laboratories built,
  `laboratory_id` added to 23 tables
- `0026_multi_lab_access.sql` — 5 real labs created, `personnel_laboratories`
  junction table
- `0027_rls_lab_isolation_FLAWED_SEE_0028.sql` — **do not run.** Introduced
  a security regression (see file header). Kept for historical record only.
- `0028_remediate_lab_policy_regression.sql` — undoes 0027, restores your
  app's original role-based security in full
- `0029_flatten_laboratories_schema.sql` — removed the organizations
  layer, matching what `src/api/laboratories.js` and `0024` already assumed
- `0030_enforce_lab_isolation_restrictive.sql` — **lab isolation is now
  genuinely enforced**, using RESTRICTIVE policies that AND with (not
  bypass) all your original role-based rules

**Nothing in this snapshot's `src/` folder has been modified.** All work
so far has been database-only.

## Deploy instructions for this snapshot

1. **Run on Supabase?** Migrations `0025`, `0026`, `0028`, `0029`, `0030`
   are **already applied** to production — this folder is the
   version-controlled record, not something to re-run. `0027` should
   **never** be run. If restoring a *fresh* Supabase project from
   scratch, run migrations 0001 through 0030 in numeric order, **skipping
   0027**.
2. **Upload to GitHub?** Yes — replace your repo's `supabase/migrations/`
   folder with the one in this zip.
3. **Redeploy on Vercel?** No — no files under `src/` changed.
4. **Test live?** ⚠️ **Recommended now, carefully.** Lab isolation is live
   for the first time. Since the app's frontend doesn't yet send
   `laboratory_id` on writes or offer a lab switcher, some writes may now
   fail where they previously succeeded. Suggest logging in as your
   Technologist test account and doing a read-only check first (viewing
   tasks/clauses), before attempting any create/edit, to see how the app
   currently behaves under real enforcement.

## Next step

Frontend work: build the lab-switcher UI and wire `laboratory_id` into
every existing write call — without that, users can currently only read
their lab's data correctly; writes are likely to start failing.
