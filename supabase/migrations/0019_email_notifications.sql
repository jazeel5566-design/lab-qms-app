-- 0019_email_notifications.sql
-- Task-assigned, NC-assigned, and document-published notifications fire once
-- at the moment of the action itself (triggered from the app) — no schema
-- needed for those. Task-overdue and EQA-cycle-due are different: nothing
-- "happens" to trigger them except time passing, so they run on a daily
-- schedule (Supabase Cron -> check-reminders Edge Function) and need a
-- marker so the same overdue task or due cycle doesn't get emailed every
-- single day forever once it's overdue.

alter table tasks add column if not exists overdue_notified_at timestamptz;
alter table eqa_events add column if not exists cycle_reminder_sent_at timestamptz;
