-- =====================================================================
-- Migration: 0046_management_review_items.sql
-- Purpose:   Redesigns Management Review records to match a real MRM
--            minutes document: multiple "inputs reviewed" (agenda
--            items) per meeting, each with its own discussion,
--            decisions, actions arising, responsible person, and
--            target date — instead of three single free-text blobs
--            covering the whole meeting.
--
--            management_reviews gains venue (part of a real MRM's
--            header info). The three original single-blob columns
--            (inputs_reviewed/decisions/actions_arising) are left in
--            place, untouched — old records keep displaying exactly as
--            they were saved; new records use the items table instead.
--
--            management_review_items has no laboratory_id of its own —
--            it inherits lab scoping through its parent review via a
--            subquery, the same pattern used for eqa_program_analytes
--            (0034).
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0045_qc_manufacturer_value_fields.sql
-- =====================================================================

ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS venue TEXT;

CREATE TABLE IF NOT EXISTS management_review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_review_id UUID NOT NULL REFERENCES management_reviews(id) ON DELETE CASCADE,
  agenda_item TEXT NOT NULL,
  discussion TEXT,
  decisions TEXT,
  actions_arising TEXT,
  responsible_person TEXT,
  target_date TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE management_review_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY mgmt_review_items_select ON management_review_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY mgmt_review_items_insert ON management_review_items FOR INSERT WITH CHECK (can_see_audit_backup());
CREATE POLICY mgmt_review_items_update ON management_review_items FOR UPDATE USING (can_see_audit_backup()) WITH CHECK (can_see_audit_backup());
CREATE POLICY mgmt_review_items_delete ON management_review_items FOR DELETE USING (can_see_audit_backup());

CREATE POLICY "Lab restriction" ON management_review_items AS RESTRICTIVE FOR ALL
  USING (EXISTS (SELECT 1 FROM management_reviews mr WHERE mr.id = management_review_id AND has_lab_access(mr.laboratory_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM management_reviews mr WHERE mr.id = management_review_id AND has_lab_access(mr.laboratory_id)));

-- =====================================================================
-- End of migration 0046_management_review_items.sql
-- =====================================================================
