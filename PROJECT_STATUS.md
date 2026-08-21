# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. Unzip this anywhere for a full working copy of
the project, independent of any other zip you've received.

## What changed in THIS update: Personnel page visibility restricted

Previously, **any** logged-in user could see every staff member's full
row on the Personnel page (name, job title, email, record card number,
access role) — only the ability to *edit* was restricted to Admin. Now:

- **Admin** — sees and can edit the full staff roster (unchanged)
- **QA Manager** — sees the full staff roster, read-only (unchanged
  visual style, now properly gated rather than open to everyone)
- **Everyone else** (Technologist, Viewer, etc.) — sees **only their own
  record**, with self-service controls to change their own contact email
  and their own password. They can no longer see anyone else's details,
  and CSV export/import of the staff list is also now restricted to
  Admin/QA Manager only (previously anyone could download the full
  roster).

**New database function (`0031`):** `update_my_email(new_email)` — a
narrow, `SECURITY DEFINER` RPC that lets a signed-in user update *only*
their own `email` column. This is deliberately NOT a broad "update your
own personnel row" RLS policy — that would also let a Technologist change
their own `access_role` to `'Admin'`, their `laboratory_id`, or their
`record_card_number` (username) directly via the client. Password
changes need no new backend at all — `supabase.auth.updateUser({
password })` already lets a signed-in user change their own password via
Supabase Auth directly, entirely separate from the personnel table.

**Frontend (`src/App.jsx`, `src/api/personnel.js`):** new `MyProfileCard`
and `MyPasswordControl` components render for anyone without full-roster
visibility. Record card number, access role, and lab assignment are shown
read-only with a note that only an Admin can change them.

## Full history of today's laboratory_id work

**Database (`0025`–`0031`):** organizations/labs built, 5 real labs
created, lab isolation enforced via RLS (with a caught-and-remediated
regression at `0027`→`0028`, a `SECURITY DEFINER` fix in `0030`), and now
safe self-service email updates in `0031`.

**Write side:** every create/insert path across the app and 4 edge
functions correctly supplies `laboratory_id`.

**Read side:** every list/fetch correctly filters by the active lab.

**Admin tooling:** create labs, create staff with a required primary lab,
reassign anyone's primary lab, grant multi-lab access, restricted staff
visibility to Admin/QA Manager with self-service for everyone else.

**Process note:** a brace/paren/bracket balance check against the
original file is standard after any multi-edit pass — it caught one real
self-inflicted syntax break earlier today before it reached production.

## Full status: database (all confirmed live on `itcmqmwcrwwxyhtznack`)

- `0025` — organizations/laboratories built, `laboratory_id` added to 23 tables
- `0026` — 5 real labs created, `personnel_laboratories` junction table
- `0027` — **do not run.** Superseded by `0028`, kept for historical record only.
- `0028` — restores original role-based security after `0027`'s regression
- `0029` — removed the organizations layer, flat `laboratories` design
- `0030` — lab isolation enforced via RESTRICTIVE policies (includes the
  `SECURITY DEFINER` fix for `has_lab_access()`, confirmed working)
- `0031` — `update_my_email()` self-service RPC, confirmed working

## Deploy instructions for THIS update

1. **Run on Supabase?** Already done — `0031` was run and confirmed
   during this session. Nothing further to run.
2. **Upload to GitHub?** Yes — `src/App.jsx`, `src/api/personnel.js`, and
   `supabase/migrations/0031_self_service_email_update.sql`.
3. **Redeploy on Vercel?** Yes — `src/` changed.
4. **Test live?** Log in as your Technologist test account and confirm:
   - The Personnel page now shows only their own record, not the full list
   - They can update their own contact email and see it save successfully
   - They can change their own password via the new control
   Then log in as QA Manager and confirm they see the full roster
   read-only (no edit controls), and as Admin to confirm nothing changed
   for that role.

## Next step

Reassign your existing personnel out of Biochemistry into their correct
labs via the Personnel page, then do a full walkthrough as a Technologist
in one lab and confirm they only ever see that lab's data anywhere in the
app.




