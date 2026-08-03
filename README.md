# Lab QMS — Wired (Frontend + Supabase Backend)

This is the full app connected to a real Supabase backend: real login, a real
shared database, and every role restriction enforced server-side, not just
hidden in the UI. This replaces both the earlier standalone (localStorage)
build and the separate backend-only package — this project is both halves,
wired together.

## Setup

**1. Create a Supabase project** (free at supabase.com).

**2. Run the migrations in order**, via the SQL Editor in your Supabase
   dashboard — paste and run each file in `supabase/migrations/`, in filename
   order (0001 through 0006).

**3. Turn off email confirmation.** Authentication → Providers → Email →
   disable "Confirm email." This app logs in with a record card number, not a
   real inbox; the synthetic addresses it generates internally can never
   receive a confirmation link.

**4. Deploy the Edge Functions** (let an Admin create new staff logins and reset
   existing passwords, without being logged out of their own session):
   ```bash
   supabase functions deploy admin-create-staff
   supabase functions deploy admin-reset-password
   ```
   (Requires the Supabase CLI: `npm install -g supabase`, then `supabase login`
   and `supabase link --project-ref YOUR-PROJECT-REF` first.)

**5. Copy `.env.example` to `.env`** and fill in your project's URL and anon
   key (Project Settings → API).

**6. Install and run:**
   ```bash
   npm install
   npm run dev
   ```

**7. Create your first Admin account.** Sign up through the app's "I'm new
   here" flow (this always creates a Technologist). Then, in the Supabase
   SQL Editor, run:
   ```sql
   update personnel set access_role = 'Admin' where record_card_number = 'YOUR-CARD-NUMBER';
   ```
   From then on, that Admin can use the in-app "Add staff member" form to
   create everyone else at whatever access level they need.

## What changed from the standalone version

Every `updateX(nextArray)` function a component calls still works exactly the
same way from the component's point of view — the difference is entirely
inside `App.jsx`'s top-level functions, which now:

- Load initial data from Supabase instead of `localStorage`
- Diff the "next" array a component hands back against what's in memory, and
  turn that into real inserts/updates/deletes (`src/dataSync.js`'s
  `syncList()` helper does this once, generically, for every entity)
- Map between the app's camelCase field names and the database's snake_case
  columns (also in `dataSync.js`)
- Revert the local UI state and show an alert if a Supabase call fails, so a
  rejected write (e.g. RLS blocking a Viewer) doesn't leave the screen showing
  something that didn't actually save

Three actions go through dedicated, narrower paths instead of the generic
sync, because the permission rule is finer than "can you write to this table":

- **Task status** updates via the `set_task_status` RPC — any non-Viewer can
  mark a task done even if they can't create or reassign tasks
- **IQC authorization** via the `authorize_qc_run` RPC — only Admin/QA Manager,
  and it stamps the caller's own identity server-side, never anything the
  client sends
- **New staff logins** via the `admin-create-staff` Edge Function, and
  **password resets for existing staff** via `admin-reset-password` — both
  require Supabase's service-role key, which never touches the browser

## Known limitations in this build

- **A few entities are genuinely create/delete only, not edit-in-place**,
  because that matches what the UI itself actually does today: equipment
  maintenance records (IQ/OQ/PQ/calibration/maintenance), IQC parameters, IQC
  control levels, and documents. None of these have an inline-edit control in
  the app, so this isn't a gap — there's simply nothing to wire up yet.
  (Analysers, competency records, tasks, NCs, equipment, EQA events, and
  clause status all support full in-place editing.)
- **File attachments are still links, not uploads.** The Documents module
  points at wherever you already store the real file.

## What I verified vs. what I couldn't

Every `.js`/`.jsx` file in this project was run through `esbuild` (a real
JavaScript compiler) with zero syntax errors, including the fully rewired
`App.jsx`. I also caught and fixed a real gap during this pass: several
database policies were written as `using (true)`, which would have made most
tables readable by anyone with just the public API key, no login required —
see `0006_require_auth_for_select.sql`.

What I could not do: actually run these migrations against a live Supabase
project, deploy the Edge Functions, or click through the running app — this
sandbox has no internet access. **Please treat your first `npm install &&
npm run dev`, connected to a real Supabase project, as the true first test.**

## Gaps found and fixed in a follow-up review

After the initial wiring, I went back through it specifically looking for
places where the UI does something the backend didn't actually support yet.
Found and fixed:

- **Competency record results were uneditable.** The UI has a working
  dropdown to update a competency record's result after creation, but the
  database layer had no update function wired up for it — every edit would
  have failed and reverted. Added `updateCompetency()` and wired it in.
- **Re-importing the analyser Excel template to edit existing analysers was
  uneditable** for the same reason — the bulk-import path matches existing
  rows by ID and edits them, but analysers had no update function either.
  Added `updateMachine()` and wired it in.
- **Password resets for existing staff** — flagged as missing in the first
  pass, now built as a second Edge Function (`admin-reset-password`) with a
  "Reset password" control on each row in Personnel (Admin only).

These were found by systematically checking every entity's actual UI
behavior against what the sync layer allowed, not by guessing — each was
confirmed to have a real, reachable code path that would have broken before
being fixed.

## Suggested order to test things in

1. Sign up as the first user, promote yourself to Admin via SQL (step 7 above).
2. Add a second test user as Technologist through the in-app form.
3. Log in as the Technologist in a private/incognito window — confirm they
   can't see admin-only pages or the "New task" button, but can update task
   status.
4. Log an IQC result as the Technologist, confirm they see "Awaiting QA
   Manager sign-off" instead of an Authorize button.
5. Log back in as Admin, authorize that result, confirm the initials and
   timestamp appear.
6. Check Audit & Backup — confirm both actions above show up, correctly
   attributed.
7. Once all of that works, re-run `IQC-Westgard-Validation-Protocol.docx`
   against this build in full before trusting it for real IQC decisions.
