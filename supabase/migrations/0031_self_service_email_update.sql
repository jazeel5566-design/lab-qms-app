-- =====================================================================
-- Migration: 0031_self_service_email_update.sql
-- Purpose:   Let a signed-in user update their OWN contact email on the
--            Personnel page, without granting a broad "update your own
--            personnel row" RLS policy.
--
--            Why not just add a permissive UPDATE policy for
--            auth_user_id = auth.uid()? Because RLS applies per ROW, not
--            per COLUMN — a broad self-update policy would also let a
--            Technologist change their own access_role to 'Admin',
--            their own laboratory_id, or their record_card_number
--            (username) directly via the Supabase client. A narrow
--            SECURITY DEFINER function that touches only the email
--            column avoids that entirely.
--
--            Self-service PASSWORD changes need no new backend at all —
--            supabase.auth.updateUser({ password }) already lets a
--            signed-in user change their own password directly via
--            Supabase Auth, entirely separate from the personnel table.
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0030_enforce_lab_isolation_restrictive.sql
-- =====================================================================

CREATE OR REPLACE FUNCTION public.update_my_email(new_email text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
begin
  update personnel
  set email = new_email
  where auth_user_id = auth.uid();

  if not found then
    raise exception 'No personnel record linked to this account.';
  end if;
end;
$function$;

-- =====================================================================
-- End of migration 0031_self_service_email_update.sql
-- =====================================================================
