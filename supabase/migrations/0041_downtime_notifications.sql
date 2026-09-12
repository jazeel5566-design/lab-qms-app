-- =====================================================================
-- Migration: 0041_downtime_notifications.sql
-- Purpose:   When equipment goes down, the section incharge and the
--            service engineer both need to be informed, and exactly
--            when they were informed needs to be on record.
--
--            section_incharge_id: an internal staff member (from
--            personnel), so a dropdown of existing staff makes sense.
--
--            service_contact_method / service_contact_detail: service
--            engineers are external (equipment manufacturer/vendor), not
--            in the personnel table — mirrors the existing
--            performed_by_external pattern on equipment_records for the
--            same reason. Contacted either via a Viber group or an
--            individual engineer; service_contact_detail holds the group
--            name or the individual's name/number as free text.
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0040_eqa_unit_field.sql
-- =====================================================================

ALTER TABLE equipment_downtime ADD COLUMN IF NOT EXISTS section_incharge_id UUID REFERENCES personnel(id);
ALTER TABLE equipment_downtime ADD COLUMN IF NOT EXISTS section_incharge_informed_at TIMESTAMPTZ;
ALTER TABLE equipment_downtime ADD COLUMN IF NOT EXISTS service_contact_method TEXT CHECK (service_contact_method IS NULL OR service_contact_method IN ('Viber group', 'Individually'));
ALTER TABLE equipment_downtime ADD COLUMN IF NOT EXISTS service_contact_detail TEXT;
ALTER TABLE equipment_downtime ADD COLUMN IF NOT EXISTS service_informed_at TIMESTAMPTZ;

-- =====================================================================
-- End of migration 0041_downtime_notifications.sql
-- =====================================================================
