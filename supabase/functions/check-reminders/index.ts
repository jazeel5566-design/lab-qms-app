// supabase/functions/check-reminders/index.ts
//
// Runs once a day via Supabase Cron (set up in the dashboard, not in this
// file — see the deployment instructions). Handles the two notifications
// that nothing "happens" to trigger — task overdue, and EQA cycle coming
// due — by checking on a schedule instead.
//
// Each notified task/cycle gets a timestamp marker (overdue_notified_at /
// cycle_reminder_sent_at) so it's only ever emailed once, not every day
// forever while it stays overdue.
//
// Uses the service role key (auto-provided by Supabase to every Edge
// Function) since this needs to read across all rows regardless of RLS.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_ADDRESS = "Lab QMS <notify@notify.medlabqms.com>";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    });
  } catch (e) {
    console.error("Failed to send to", to, e);
  }
}

serve(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let overdueNotified = 0;
  let cyclesNotified = 0;

  const { data: settingsRows } = await supabase.from("notification_settings").select("event_key, enabled");
  const isEnabled = (key: string) => settingsRows?.find(s => s.event_key === key)?.enabled !== false; // defaults to enabled if the row is somehow missing

  // ---------- Overdue tasks ----------
  if (isEnabled("task_overdue")) {
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, assigned_to")
    .lt("due_date", today)
    .neq("status", "Done")
    .is("overdue_notified_at", null);

  for (const t of overdueTasks || []) {
    if (t.assigned_to) {
      const { data: person } = await supabase.from("personnel").select("email, name").eq("id", t.assigned_to).single();
      if (person?.email) {
        await sendEmail(
          person.email,
          `Task overdue: ${t.title}`,
          `<p>Hi ${person.name},</p><p>Your task "<strong>${t.title}</strong>" was due on ${t.due_date} and is still not marked Done.</p>`
        );
        overdueNotified++;
      }
    }
    await supabase.from("tasks").update({ overdue_notified_at: new Date().toISOString() }).eq("id", t.id);
  }
  }

  // ---------- EQA cycles due within 7 days (or already overdue) ----------
  if (isEnabled("eqa_cycle_due")) {
  const { data: eqaEvents } = await supabase
    .from("eqa_events")
    .select("id, parameter, next_cycle_date, date_received")
    .not("next_cycle_date", "is", null)
    .lte("next_cycle_date", in7Days)
    .is("cycle_reminder_sent_at", null);

  // Only the most recent event per analyte counts — an older event's cycle date is stale once a newer result exists.
  const latestByParam: Record<string, { id: string; parameter: string; next_cycle_date: string; date_received: string }> = {};
  for (const e of eqaEvents || []) {
    if (!latestByParam[e.parameter] || e.date_received > latestByParam[e.parameter].date_received) {
      latestByParam[e.parameter] = e;
    }
  }

  const { data: managers } = await supabase
    .from("personnel")
    .select("email, name")
    .in("access_role", ["Admin", "Deputy Admin", "QA Manager", "Deputy QA Manager"])
    .not("email", "is", null);

  for (const e of Object.values(latestByParam)) {
    for (const m of managers || []) {
      await sendEmail(
        m.email,
        `EQA cycle due: ${e.parameter}`,
        `<p>Hi ${m.name},</p><p>The next EQA cycle for <strong>${e.parameter}</strong> is due ${e.next_cycle_date}.</p>`
      );
    }
    await supabase.from("eqa_events").update({ cycle_reminder_sent_at: new Date().toISOString() }).eq("id", e.id);
    cyclesNotified++;
  }
  }

  return new Response(
    JSON.stringify({ success: true, overdueNotified, cyclesNotified }),
    { headers: { "Content-Type": "application/json" } }
  );
});
