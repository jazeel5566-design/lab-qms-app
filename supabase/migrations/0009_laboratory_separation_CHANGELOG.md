# Migration 0009 — Laboratory Separation

**Date applied to production:** 2026-08-21
**Applied via:** Supabase SQL Editor (manual, statement-by-statement)
**Status:** Database migration complete. Application code and RLS policies NOT yet updated.

---

## Why

The QMS app was originally single-lab. Medilixmaldives now needs to support
**one organization owning multiple laboratories**, each with its own isolated
clause tracking, tasks, NCs, risks, evidence, QC data, equipment, personnel,
and documents.

This migration was triggered while trying to alter `clause_status`'s unique
constraint and hitting:

```
ERROR: 2BP01: cannot drop constraint clause_status_clause_id_key on table
clause_status because other objects depend on it
DETAIL: constraint tasks_clause_id_fkey ... nonconformities_clause_id_fkey ...
risks_clause_id_fkey ... clause_evidence_clause_id_fkey ...
task_templates_default_clause_id_fkey ... depends on index
clause_status_clause_id_key
```

That error surfaced a larger gap: neither `organizations` nor `laboratories`
had the structure needed to scope data per lab. This migration builds that
structure from scratch.

## What changed

### 1. New hierarchy
- Created `organizations` table
- Added `organization_id` (NOT NULL) to `laboratories`
- Seeded `Default Organization` → `Default Laboratory` so existing data has
  a home

### 2. `laboratory_id` added to 21 tables
Each table got: add column → backfill to Default Laboratory → set NOT NULL.

`clause_status`, `tasks`, `nonconformities`, `risks`, `clause_evidence`,
`task_templates`, `audit_log`, `competency_records`,
`document_acknowledgments`, `documents`, `eqa_events`, `equipment`,
`equipment_downtime`, `equipment_records`, `machine_api_keys`,
`management_reviews`, `notification_settings`, `personnel`, `qc_controls`,
`qc_machines`, `qc_parameters`, `qc_runs`, `task_comments`

### 3. `clause_status` uniqueness rescoped
- Old: `UNIQUE (clause_id)` — one row per clause, globally
- New: `UNIQUE (clause_id, laboratory_id)` — one row per clause, per lab

### 4. Five foreign keys rebuilt as composite
`tasks`, `nonconformities`, `risks`, `clause_evidence`, `task_templates` now
reference `clause_status (clause_id, laboratory_id)` instead of
`clause_status (clause_id)` alone — so a task/NC/risk/evidence row can only
link to a clause status row in its own lab.

### 5. `log_audit()` trigger patched
This generic trigger fires on many tables and inserts into `audit_log`. It
didn't set `laboratory_id`, which broke once `audit_log.laboratory_id` became
NOT NULL. Fixed by pulling `laboratory_id` dynamically off the row that fired
the trigger via `to_jsonb(new/old)->>'laboratory_id'`.

## Known issues hit and resolved during the session

| Issue | Cause | Fix |
|---|---|---|
| `laboratory_id` column doesn't exist on UPDATE | Ran ADD COLUMN + UPDATE in one batch; first statement's error rolled back the whole transaction silently | Ran statements individually until confirmed pattern was safe to batch |
| `audit_log` NOT NULL violation during batch | `log_audit()` trigger inserts into `audit_log` without `laboratory_id` | Patched trigger function before re-running the batch |
| Full table/column list truncated in Supabase UI | Wide result columns get cut off visually | Used `string_agg` / row-per-line queries instead |

## What this migration does NOT cover (deliberately out of scope)

- **Row Level Security (RLS)** — no policies exist yet enforcing lab
  isolation at the database level. Currently any authenticated user can
  query any lab's data if they know/guess an ID.
- **Application code** — no frontend/API calls pass `laboratory_id` yet.
  Every INSERT into the 21 tables above will fail today until the app is
  updated, since the column is NOT NULL.
- **Auth/session lab context** — `personnel.laboratory_id` exists in the DB
  but nothing in the auth flow surfaces "which lab is this user in" yet.
- **Multi-lab testing** — only `Default Laboratory` exists with real data;
  isolation has not been verified against a second lab.

## Next steps (tracked separately)

1. Decide: does a user belong to exactly one lab, or can they switch
   between labs they have access to?
2. Update app code — pass `laboratory_id` on every write, filter every read
3. Add RLS policies
4. Create a second lab and manually verify isolation
5. Deploy (GitHub → Vercel) and run through live testing checklist,
   including cross-lab access checks
