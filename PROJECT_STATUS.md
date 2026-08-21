# Lab QMS — Complete Project Snapshot (2026-08-21, mid-session)

This zip is a **complete, self-contained copy of the entire app** as of
this point in today's session — `src/`, `public/`, `supabase/` (all
migrations and edge functions), config files, everything. You can unzip
this anywhere and have a full working copy of the project, independent of
any other zip you've received.

**From now on, every update in this session will be packaged this way —
a full project snapshot, not just the new files — so any single zip you
have is a complete restore point on its own.**

## What's confirmed applied to production (Supabase project `itcmqmwcrwwxyhtznack`)

- `0025_laboratory_separation.sql` — organizations/laboratories built,
  `laboratory_id` added to 23 tables
- `0026_multi_lab_access.sql` — 5 real labs created, `personnel_laboratories`
  junction table, `is_admin()`/`get_my_accessible_labs()` helpers
- `0027_rls_lab_isolation_FLAWED_SEE_0028.sql` — **do not run.** Introduced
  a security regression (see file header). Kept for historical record only.
- `0028_remediate_lab_policy_regression.sql` — undoes 0027, restores your
  app's original role-based security in full
- `0029_flatten_laboratories_schema.sql` — removed the organizations
  layer per your decision to keep the schema flat, matching what
  `src/api/laboratories.js` and `0024` already assumed

## What's IN PROGRESS, not yet confirmed applied

- `has_lab_access(lab_id)` helper function — drafted, given to you to run,
  **not yet confirmed** as of this snapshot
- RESTRICTIVE RLS policies on all 23 tables, enforcing lab isolation the
  correct way this time (AND'd with existing role policies, not OR'd)

**Nothing in this snapshot's `src/` folder has been modified today.**
All work so far has been database-only.

## Deploy instructions for this snapshot

1. **Run on Supabase?** Migrations `0025`, `0026`, `0028`, `0029` are
   **already applied** to production — this folder is the version-controlled
   record, not something to re-run. `0027` should **never** be run (it's
   the flawed one). If you're restoring a *fresh* Supabase project from
   scratch, run migrations 0001 through 0029 in numeric order, **skipping
   0027**.
2. **Upload to GitHub?** Yes — replace your repo's `supabase/migrations/`
   folder with the one in this zip (adds 0025, 0026, 0027-flawed, 0028,
   0029; nothing existing is changed).
3. **Redeploy on Vercel?** No — no files under `src/` changed. Vercel
   builds the frontend from `src/`, so there's nothing new for it to pick
   up yet.
4. **Test live?** Not required yet — lab isolation isn't enforced by RLS
   yet (that's the in-progress part above), so there's nothing new to
   verify in the live app at this exact snapshot.

## Next step

Confirm the `has_lab_access()` function ran successfully, then we finish
the RESTRICTIVE policies batch (`0030`), and you'll get the next complete
snapshot with full lab isolation actually enforced.
