# Lab QMS — Complete Project Snapshot (2026-08-21)

This zip is a **complete, self-contained copy of the entire app** —
`src/`, `public/`, `supabase/` (all migrations and edge functions),
config files, everything. Unzip this anywhere for a full working copy of
the project, independent of any other zip you've received.

## What changed in THIS update: HL7/ASTM analyser groundwork in the app

Following the research on Abbott Alinity and Roche analyser connectivity,
this builds the app-side data model and admin UI needed to receive
results through an HL7/ASTM interface — not a protocol implementation
inside this app itself (Supabase Edge Functions can't passively listen
for raw HL7/ASTM socket connections; that still needs a small on-premises
interface engine like Mirth Connect sitting in front of this app,
translating and forwarding), but everything on the receiving/
configuration side.

**On the IQC page, each machine now has:**
- **Connection protocol** — HL7, ASTM, Manual/API, or plain manual entry
- **Analyser type** — the instrument *model* (e.g. "Abbott Alinity
  ci-series"), separate from the friendly name you give the specific
  unit, since code mappings are shared across every machine of the same
  model
- **Vendor instrument ID** — the identifier the analyser uses for itself
  in HL7/ASTM messages, often different from its name in this app

**New "Manage test codes" button** appears on any machine with a
protocol set (HL7/ASTM). Opens a per-analyser-type mapping screen: enter
the instrument's own test code (e.g. "GLU") and which of your app's
analyte names it corresponds to. Mappings are shared across every
machine of that same analyser type.

**Database (`0042`):** `protocol`, `analyser_type`, `vendor_instrument_id`
added to `qc_machines`; new `analyser_test_code_mappings` table.

**`ingest-qc-result` edge function updated** to accept either a
`machineName` or a `vendorInstrumentId`, and either a `parameter` name or
a `vendorTestCode` — if a vendor code is sent, it's resolved through the
new mapping table using that machine's `analyser_type` before proceeding
with the existing insert logic. This is the actual bridge point: an
interface engine parsing HL7/ASTM messages from an Alinity or cobas
system can now just forward the analyser's own instrument ID and test
code as-is, without needing to know this app's internal naming at all —
the app resolves it.

## Full history of today's work

**Database (`0025`–`0042`):** organizations/labs built, 5 real labs
created, lab isolation enforced via RLS (with a caught-and-remediated
regression at `0027`→`0028`), self-service email updates (`0031`),
dynamic EQA disciplines + sample tracking (`0032`), run/due dates + cycle
summary (`0033`), real EQA program catalog (`0034`/`0035`), NC→task
linking (`0036`), NC/CAPA workflow redesign (`0037`), per-lab NC
numbering (`0038`), assignee-editable NCs + full verification/
effectiveness lifecycle (`0039`), EQAS unit field (`0040`), downtime
notification tracking (`0041`), and now HL7/ASTM analyser protocol +
test code mapping groundwork (`0042`).

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

## Deploy instructions for THIS update

1. **Run on Supabase?** Already done — `0042` was run and confirmed
   during this session.
2. **Upload to GitHub?** Yes — `src/App.jsx`, `src/dataSync.js`, the new
   `src/api/analyserMappings.js`, the updated
   `supabase/functions/ingest-qc-result/index.ts`, and the new `0042`
   migration file.
3. **Redeploy on Vercel?** Yes — `src/` changed.
4. **Redeploy the edge function?** Yes:
   ```
   supabase functions deploy ingest-qc-result
   ```
5. **Test live?**
   - IQC & Levey-Jennings → Add machine → confirm the new Analyser type,
     Connection protocol, and Vendor instrument ID fields appear
   - Add a machine with protocol = HL7 or ASTM → confirm a "Manage test
     codes" button appears once it's selected → add a mapping (e.g.
     vendor code "GLU" → your "Glucose" parameter) → confirm it saves and
     lists correctly
   - If you have a way to test the edge function directly (e.g. via
     curl/Postman with a real `machine_api_key`), try posting with
     `vendorInstrumentId` + `vendorTestCode` instead of `machineName` +
     `parameter`, and confirm it resolves correctly through the mapping

## What this does NOT include yet (by design, per today's research)

Nothing in this update makes the app actually *receive* live HL7/ASTM
traffic from an Alinity or cobas system — that still requires a separate
on-premises interface engine (Mirth Connect/NextGen Connect is the
standard free option) configured per the vendor's own Host Interface
Manual, translating their messages and forwarding the result to this
app's `ingest-qc-result` endpoint. This update is the app-side half of
that bridge: the data model and admin UI to configure and resolve the
mapping once that engine is in place.

## Next step

Reassign your existing personnel out of Biochemistry into their correct
labs via the Personnel page, then do a full walkthrough as a Technologist
in one lab and confirm they only ever see that lab's data anywhere in the
app.
