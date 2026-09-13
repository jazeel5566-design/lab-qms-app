-- =====================================================================
-- Migration: 0042_analyser_protocol_mapping.sql
-- Purpose:   Lays the database groundwork for HL7/ASTM analyser
--            integration (via an on-premises interface engine like
--            Mirth Connect, which translates and forwards to the
--            existing ingest-qc-result edge function — Supabase Edge
--            Functions can't passively listen for raw HL7/ASTM socket
--            connections themselves, so this is the receiving side of
--            that bridge, not a protocol implementation in the app).
--
--            qc_machines gains:
--              - protocol: which wire protocol this specific instrument
--                uses (HL7, ASTM, or Manual/API for anything entered by
--                hand or already sent as plain JSON)
--              - analyser_type: the instrument MODEL (e.g. "Abbott
--                Alinity ci-series", "Roche cobas c 311") — test code
--                mappings are defined per model, not per individual
--                machine, since a lab may own several units of the same
--                model that all use identical vendor test codes
--              - vendor_instrument_id: the identifier the analyser uses
--                for itself in HL7/ASTM messages, which is often not the
--                same as the friendly name given to it in this app
--
--            analyser_test_code_mappings: one row per (analyser type,
--            vendor test code) -> this app's parameter name, scoped per
--            lab. Resolved by ingest-qc-result when a vendor code is
--            sent instead of (or alongside) a parameter name.
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0041_downtime_notifications.sql
-- =====================================================================

ALTER TABLE qc_machines ADD COLUMN IF NOT EXISTS protocol TEXT CHECK (protocol IS NULL OR protocol IN ('HL7', 'ASTM', 'Manual/API'));
ALTER TABLE qc_machines ADD COLUMN IF NOT EXISTS analyser_type TEXT;
ALTER TABLE qc_machines ADD COLUMN IF NOT EXISTS vendor_instrument_id TEXT;

CREATE TABLE IF NOT EXISTS analyser_test_code_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id),
  analyser_type TEXT NOT NULL,
  vendor_test_code TEXT NOT NULL,
  parameter_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (laboratory_id, analyser_type, vendor_test_code)
);

ALTER TABLE analyser_test_code_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analyser_test_code_mappings_select" ON analyser_test_code_mappings FOR SELECT
  USING (true);
CREATE POLICY "analyser_test_code_mappings_insert" ON analyser_test_code_mappings FOR INSERT
  WITH CHECK (can_edit());
CREATE POLICY "analyser_test_code_mappings_update" ON analyser_test_code_mappings FOR UPDATE
  USING (can_edit());
CREATE POLICY "analyser_test_code_mappings_delete" ON analyser_test_code_mappings FOR DELETE
  USING (can_edit());

CREATE POLICY "Lab restriction" ON analyser_test_code_mappings AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

-- =====================================================================
-- End of migration 0042_analyser_protocol_mapping.sql
-- =====================================================================
