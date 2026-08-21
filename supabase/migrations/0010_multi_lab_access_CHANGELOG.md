# Migration 0010 — Multi-Lab Access & Specialty Laboratories

**Date applied to production:** 2026-08-21
**Applied via:** Supabase SQL Editor (manual, statement-by-statement)
**Status:** Database migration complete. Frontend lab-switcher and RLS on
the remaining 21 data tables NOT yet done.

---

## Why

Following migration 0009 (laboratory separation), Medilixmaldives needs the
five real laboratory departments set up, and support for staff — like the
QC Manager — who oversee more than one lab and need to switch between them
without logging out.

## What changed

### 1. Renamed the placeholder lab
`Default Laboratory` → `Biochemistry`. All existing production data
(34 `clause_status` rows and everything else backfilled in migration 0009)
now sits under a real department name.

### 2. Created four new laboratories
`Hematology`, `Clinical Pathology`, `Infectious Serology`, `Microbiology` —
all under the same `Default Organization`. All start empty.

### 3. Multi-lab access model
- `personnel.laboratory_id` remains each user's **primary/default** lab
  (unchanged from migration 0009)
- New table `personnel_laboratories` holds **additional** labs a user can
  access — e.g. a QC Manager assigned to both Biochemistry and Hematology
- A user's dropdown at login should show: primary lab + any rows in
  `personnel_laboratories`

### 4. Helper functions
- `is_admin()` — true if the logged-in user's `personnel.access_role =
  'Admin'`. Used by RLS policies so the check isn't repeated everywhere.
- `get_my_accessible_labs()` — returns every lab the current user can
  access, with `is_default` flagging their primary lab. Meant to be called
  by the frontend right after login to populate the lab-switcher dropdown.

### 5. RLS enabled on `laboratories` and `personnel_laboratories`
- **Anyone authenticated** can `SELECT` from both (needed so the dropdown
  works for every user, not just admins)
- **Only Admins** (`access_role = 'Admin'`) can `INSERT`/`UPDATE`/`DELETE`
  — i.e. only admins can create new laboratories or assign/remove a
  person's lab access

## What this migration does NOT cover

- **RLS on the other 21 data tables** — `clause_status`, `tasks`,
  `nonconformities`, `risks`, `clause_evidence`, `task_templates`,
  `audit_log`, `competency_records`, `document_acknowledgments`,
  `documents`, `eqa_events`, `equipment`, `equipment_downtime`,
  `equipment_records`, `machine_api_keys`, `management_reviews`,
  `notification_settings`, `personnel`, `qc_controls`, `qc_machines`,
  `qc_parameters`, `qc_runs`, `task_comments` have **no RLS yet**. Any
  authenticated user can currently query any lab's data on these tables
  directly. This is the next priority.
- **Reassigning existing personnel** — everyone currently defaults to
  Biochemistry (inherited from migration 0009's backfill). Real
  reassignment to Hematology / Clinical Pathology / Infectious Serology /
  Microbiology will be done later through the app's admin UI, not via SQL.
- **Frontend work** — no app code has been touched. Still needed:
  - Login/session lab-switcher dropdown, calling `get_my_accessible_labs()`
  - "Active lab" state stored in session, used to scope all reads/writes
  - Admin UI to create labs and assign personnel to labs
  - UI to let a user (or admin) change which of their assigned labs is
    marked default

## Next steps (tracked separately)

1. Add RLS policies to the remaining 21 data tables, scoped by
   `laboratory_id` matching the user's primary lab or any lab in
   `personnel_laboratories`
2. Build the frontend lab-switcher and admin lab-management screens
3. Reassign existing personnel to their correct labs via the new UI
4. Create test users in multiple labs and verify isolation end-to-end
5. Deploy (GitHub → Vercel) and run the live testing checklist, including
   multi-lab switching and cross-lab isolation checks
