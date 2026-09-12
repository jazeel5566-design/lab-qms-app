# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. Unzip this anywhere for a full working copy of
the project, independent of any other zip you've received.

## What changed in THIS update: full NC/CAPA investigation + closure workflow

Extends last update's NC/CAPA redesign with the actual investigation and
sign-off lifecycle, using the app's existing 6-state status list (no new
statuses needed — they already mapped cleanly onto what was described):

**1. Assignee now fills in and submits their own investigation.**
When an NC is assigned to someone, they now see **editable** Root cause
analysis / Corrective action / Preventive action / Evidence fields
directly on their NC (previously read-only for everyone but managers) —
plus a **"Submit for verification"** button, enabled once root cause and
corrective action are filled in. Submitting sets status to
`Action implemented`.

**2. A verifying manager/deputy is chosen at assignment time.**
`NcForm` (the manager's full creation form) now has a required
**"Verifying manager / deputy"** field whenever an NC is assigned to
someone — restricted to Admin/Deputy Admin/QA Manager/Deputy QA Manager
(the existing `TASK_ASSIGNER_ROLES` group). This reuses the existing
`verified_by` column rather than adding a new one — it now represents
"who is designated to verify," set upfront, and stays populated once
they actually do.

**3. Verifying the corrective action → partially closed.**
Once status is `Action implemented`, a **"Verify corrective action"**
button appears for managers (disabled until a verifying manager/deputy
is set) — clicking it sets status to `Verified`. This is the "partially
closed" state described.

**4. Effectiveness check, done by the same person → fully closed.**
The Effectiveness Check section's Result dropdown is now **disabled
until status is `Verified` or later** — enforcing the correct order
(verify the fix, then check it worked, not the other way round). Its
"Verified by" field no longer has its own separate dropdown — it's
**locked to display the same verifying manager/deputy** chosen earlier,
so the same accountable person handles both steps. Setting the result to
**"Effective" automatically closes the NC** — status becomes `Closed`
and the close date is stamped, exactly as described. "Not effective"
leaves it open for further action instead.

**Database (`0039`):** the NC `UPDATE` policy now also allows the
person an NC is **assigned to** — previously only the raiser and
managers could update an NC at all, which would have silently blocked
the assignee from ever saving their investigation.

## Full history of today's work

**Database (`0025`–`0039`):** organizations/labs built, 5 real labs
created, lab isolation enforced via RLS (with a caught-and-remediated
regression at `0027`→`0028`), self-service email updates (`0031`),
dynamic EQA disciplines + sample tracking (`0032`), run/due dates + cycle
summary (`0033`), real EQA program catalog (`0034`/`0035`), NC→task
linking (`0036`), NC/CAPA workflow redesign (`0037`), per-lab NC
numbering (`0038`), and now the full investigation/verification/
effectiveness lifecycle (`0039`).

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

## Deploy instructions for THIS update

1. **Run on Supabase?** Already done — `0039` was run and confirmed
   during this session.
2. **Upload to GitHub?** Yes — `src/App.jsx` and the new `0039`
   migration file.
3. **Redeploy on Vercel?** Yes — `src/` changed.
4. **Test live?** Full walkthrough, in order:
   - As Admin/QA Manager: log a new NC, assign it to a Technologist, and
     confirm you're required to also pick a "Verifying manager/deputy"
     before saving
   - As that Technologist: open the NC, confirm you can now edit root
     cause/corrective/preventive/evidence, and that "Submit for
     verification" only enables once root cause + corrective action are
     filled in
   - Submit it — status should become `Action implemented`
   - Back as the manager: confirm "Verify corrective action" appears,
     click it — status becomes `Verified`
   - In the Effectiveness Check section, confirm the Result dropdown was
     disabled before this point and is now enabled; set it to
     "Effective" — status should automatically become `Closed` with a
     close date stamped

## Next step

Reassign your existing personnel out of Biochemistry into their correct
labs via the Personnel page, then do a full walkthrough as a Technologist
in one lab and confirm they only ever see that lab's data anywhere in the
app.
