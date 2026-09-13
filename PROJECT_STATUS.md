# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. Unzip this anywhere for a full working copy of
the project, independent of any other zip you've received.

## What changed in THIS update: real error messages instead of a generic wrapper

No database changes — frontend only.

**Root cause of "Edge Function returned a non-2xx status code":** this is
a well-documented `supabase-js` gotcha, not specific to your account or
data. `supabase.functions.invoke()` discards the edge function's actual
`{ error: "..." }` response body by default when the status isn't 2xx —
the `error.message` it gives back is always just that same generic
string, no matter what the function actually said was wrong. The real
reason was always there, just not being read out.

**Fixed with one shared helper** (`functionErrorMessage()` in
`supabaseClient.js`) that properly reads the function's real error body,
applied everywhere in the app that calls an edge function this way:
- Generating an API key (`create-api-key`) — the one you hit
- Creating a staff account (`admin-create-staff`)
- Resetting a password (`admin-reset-password`)
- Checking email sending status (`check-resend-status`)
- Sending notification emails (`send-email`) — this one had an even more
  basic gap: it wasn't checking the returned error at all, so a failed
  notification email was silently invisible even in the browser console

**This won't tell us why the very first attempt failed** — that error is
already gone. But the next time anything like this happens anywhere in
the app, you'll see the actual reason instead of a meaningless generic
message.

## To find out what actually went wrong with your API key attempt

Since the fix can't retroactively recover that specific error, the
fastest path is the Supabase dashboard directly: **Edge Functions →
create-api-key → Logs**. That shows the exact server-side error for that
request, no matter what the browser saw.

**One likely cause worth ruling out first:** `create-api-key` requires
`laboratory_id` on every key (since a much earlier migration), and
resolves it either from the selected machine or from your currently
active lab. If this function's *deployed* code is an older version from
before that requirement existed, it would fail trying to insert a row
missing a required field. Worth **redeploying `create-api-key`** via the
Supabase dashboard's Edge Functions editor (same way you deployed
`ingest-qc-result` earlier) — the current code is included in this zip
either way, so it's a safe thing to just redeploy and confirm current.

## Full history of today's work

**Database (`0025`–`0045`):** organizations/labs built, 5 real labs
created, lab isolation enforced via RLS, self-service email updates,
dynamic EQA disciplines, real EQA program catalog, NC/CAPA full lifecycle
redesign, EQAS unit field, downtime notification tracking, HL7/ASTM
analyser protocol groundwork, Settings reorganization, full IQC page
rebuild, manufacturer QC value-assignment fields, and the Interface
engine tab.

**This update:** real edge function error messages surfaced app-wide
(frontend only).

## Full status: database (all confirmed live on `itcmqmwcrwwxyhtznack`)

- `0025`–`0026` — organization/lab foundation, multi-lab access
- `0027` — **do not run.** Superseded by `0028`.
- `0028`–`0030` — security regression fixed, orgs flattened, lab isolation enforced
- `0031` — self-service email update RPC
- `0032` — EQA discipline check dropped, `sample_number` column added
- `0033` — `run_date` and `due_date` columns added to `eqa_events`
- `0034`/`0035` — EQA program catalog schema + seeded with 16 programs/111 analytes
- `0036` — `linked_task_id` added to `nonconformities`
- `0037` — NC workflow redesign: `date_occurred`, `generate_nc_number()`, new RLS
- `0038` — NC number uniqueness rescoped to per-lab
- `0039` — assignee can update their own NC (root cause, corrective action, etc.)
- `0040` — `unit` column added to `eqa_events`
- `0041` — downtime notification tracking (section incharge, service engineer)
- `0042` — `qc_machines` protocol/analyser type/vendor ID + test code mapping table
- `0043` — `material_name` added to `qc_controls`
- `0044` — `unit` added to `qc_runs`
- `0045` — `cv_percent`, `range_low`, `range_high`, `peer_group_n`, `reagent_lot` added to `qc_controls`

## Deploy instructions for THIS update

1. **Run on Supabase?** No — no database changes.
2. **Upload to GitHub?** Yes — `src/App.jsx`, `src/supabaseClient.js`,
   `src/api/machineKeys.js`, `src/api/notifications.js`,
   `src/api/adminStaff.js`.
3. **Redeploy on Vercel?** Yes — `src/` changed.
4. **Also worth doing:** redeploy `create-api-key` on Supabase (see
   above), then try "Generate new API key" again — with the fix in
   place, if it still fails you'll now see the actual reason on screen.

## Next step

Reassign your existing personnel out of Biochemistry into their correct
labs via the Personnel page, then do a full walkthrough as a Technologist
in one lab and confirm they only ever see that lab's data anywhere in the
app.
