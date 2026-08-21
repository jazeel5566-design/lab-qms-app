# Migration 0011 — RLS Laboratory Isolation

**Date applied to production:** 2026-08-21
**Applied via:** Supabase SQL Editor (single batched script)
**Status:** Database-level lab isolation is now fully enforced. Frontend
integration is the remaining blocker before this is safe to use.

---

## Why

Migrations 0009 and 0010 gave every table a `laboratory_id` column and
built the organization → laboratory → multi-lab-access structure, but
**nothing actually stopped a logged-in user from querying another lab's
data**. Isolation existed only as a column value — enforcement depended
entirely on the application remembering to add `WHERE laboratory_id = ...`
to every query, everywhere, forever. This migration closes that gap with
Postgres Row Level Security, so the database itself refuses cross-lab
access regardless of what the app does or forgets to do.

## What changed

### 1. `get_my_lab_ids()` helper function
Returns an array of every lab the current user can access — their primary
lab (`personnel.laboratory_id`) plus any additional labs from
`personnel_laboratories`. Every policy below uses this instead of
duplicating the join logic 23 times.

### 2. RLS enabled + policy added on 23 tables
`clause_status`, `tasks`, `nonconformities`, `risks`, `clause_evidence`,
`task_templates`, `audit_log`, `competency_records`,
`document_acknowledgments`, `documents`, `eqa_events`, `equipment`,
`equipment_downtime`, `equipment_records`, `machine_api_keys`,
`management_reviews`, `notification_settings`, `personnel`,
`qc_controls`, `qc_machines`, `qc_parameters`, `qc_runs`, `task_comments`

**Standard rule:** a row is visible/writable only if its `laboratory_id`
is in `get_my_lab_ids()`, or the user is an Admin (`is_admin()` bypasses
lab-scoping entirely).

**Two deviations from the standard rule:**
- `audit_log` — read is lab-scoped as normal, but there's no UPDATE/DELETE
  policy at all (audit trail should be immutable), and INSERT is left open
  since the `log_audit()` trigger runs as `SECURITY DEFINER` on behalf of
  the system, not the acting user
- `personnel` — the read policy additionally allows `auth_user_id =
  auth.uid()`, so a user can always see their own profile row even in an
  edge case where lab logic alone might not cover it

## ⚠️ Critical — read before deploying app changes

**Every INSERT/UPDATE in the app must now supply a `laboratory_id` that
matches one of the current user's accessible labs**, or Postgres will
silently reject the write (RLS `WITH CHECK` failure — the API will return
a permission error, not a helpful validation message). This did not
matter before this migration; it matters now, everywhere.

Before deploying any frontend changes, double-check that every write path
in the app (task creation, NC logging, QC entry, document upload, etc.)
includes the active lab's ID.

## What this migration does NOT cover

- **Frontend** — no app code exists yet to determine "which lab is
  currently active" per session, or to pass it into API calls. Until
  that's built, the app cannot successfully write any new data.
- **Personnel reassignment** — everyone is still under Biochemistry from
  the 0009 backfill. Planned via the admin UI once built.
- **End-to-end verification** — RLS has been added but not yet tested by
  logging in as two different users in two different labs and confirming
  isolation actually holds in practice.

## Next steps (tracked separately)

1. Build the frontend: login lab-switcher, "active lab" session state,
   admin UI for lab/personnel management
2. Wire every existing write call in the app to include `laboratory_id`
3. Reassign real personnel to their correct labs
4. Create a second test user in a different lab; verify they cannot see
   or modify Biochemistry's data, and vice versa
5. Deploy (GitHub → Vercel) and run the full live testing checklist
