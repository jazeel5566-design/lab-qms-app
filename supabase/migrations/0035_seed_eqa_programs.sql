-- =====================================================================
-- Migration: 0035_seed_eqa_programs.sql
-- Purpose:   Seeds the eqa_programs / eqa_program_analytes catalog with
--            real data from EQAS_details.xlsx (16 programs, 111 analytes
--            across Hematology, Biochemistry, Clinical Pathology, and
--            Infectious Serology). Microbiology has no EQA programs in
--            the source spreadsheet, so none are seeded for that lab.
--
-- NOTE:      Run this in the Supabase SQL editor to apply it.
--
-- Depends on: 0034_eqa_program_catalog.sql
-- =====================================================================

DO $$
DECLARE
  v_lab_id uuid;
  v_program_id uuid;
BEGIN
  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Hematology';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Hematology'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Blood typing program', '11', '2026-02-23', '2026-10-27')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Hematology';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Hematology'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Coagulation program', '14', '2026-04-21', '2027-03-16')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'APTT', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'D-dimer', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'PT,ISI<=1.4', 3) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Hematology';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Hematology'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Hematology Program (A,B,C,D)', '21', '2026-04-14', '2027-03-04')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Hematocrit', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Hemoglobin,Total', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'MCH', 3) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'MCHC', 4) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'MCV', 5) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'MPV', 6) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Platelets', 7) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'RDW', 8) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'RDW-SD', 9) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Red Blood Cells', 10) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'WBC', 11) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Biochemistry';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Biochemistry'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Cardiac markers program', '14', '2026-04-21', '2027-03-16')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'CK-MB Mass', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Homocysteine', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'BNP', 3) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'NT-ProBNP', 4) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Troponin-I', 5) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Biochemistry';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Biochemistry'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Clinical Chemistry program', '24', '2025-07-28', '2026-06-29')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Glucose', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Albumin', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'ALKP', 3) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'ALT', 4) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Amylase', 5) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'AST', 6) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Bilirubin Direct', 7) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Bilirubin Total', 8) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Calcium', 9) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Chloride', 10) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Cholesterol HDL', 11) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Cholesterol LDL', 12) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Creatinine Kinase', 13) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Cholesterol Total', 14) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Creatinine', 15) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'eGFR', 16) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'G-Glutamyl Transferase', 17) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Iron', 18) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Lactate', 19) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'LDH', 20) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Lipase', 21) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Lithium', 22) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Magnesium', 23) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Osmolality', 24) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Phosphorous', 25) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Potassium', 26) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'T. Protein', 27) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Sodium', 28) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'TIBC', 29) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Transferrin', 30) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Triglycerides', 31) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Urea Nitrogen', 32) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Uric Acid', 33) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Biochemistry';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Biochemistry'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Ethanol/Ammonia Program', '14', '2026-04-21', '2027-03-30')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Ammonia', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Biochemistry';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Biochemistry'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Hemoglobin Program', '23', '2026-12-17', '2026-11-19')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Biochemistry';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Biochemistry'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Immunoassay Program', '23', '2026-01-12', '2027-12-14')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Biochemistry';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Biochemistry'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Lipids Program', '14', '2026-05-04', '2027-04-05')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Cholesterol,Total', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Apolipoprotein B', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Cholesterol,HDL', 3) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Cholesterol,LDL', 4) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Lipoprotein(a)', 5) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Triglycerides', 6) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Biochemistry';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Biochemistry'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'TDM program', '51', '2026-05-27', '2027-04-29')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Amikacin', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Carbamazepine', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Gentamicin', 3) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Lithium', 4) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Phenytoin', 5) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Valporic Acid', 6) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Vancomycin', 7) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Biochemistry';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Biochemistry'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Serum Proteins program', '53', '2026-02-09', '2027-01-11')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'ASO', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Beta 2 Microglobulin', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'CRP', 3) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'C3', 4) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'C4', 5) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Heptaglobin', 6) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'IgA', 7) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'IgG', 8) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'IgM', 9) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'RAF', 10) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Biochemistry';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Biochemistry'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Urine Chemistry Program', '18', '2025-12-10', '2027-11-10')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, '24-hour,Creatinine', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, '24-hour,Urea', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, '24-hour,Urea Nitrogen', 3) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, '24-hour,Uric acid', 4) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Calcium', 5) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Chloride', 6) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Creatinine', 7) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Glucose', 8) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Magnesium', 9) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Microalbumin', 10) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Osmolality', 11) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Phosphorous', 12) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Potassium', 13) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Sodium', 14) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Urea', 15) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Urea Nitrogen', 16) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Uric acid', 17) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Urinary Protein,Total', 18) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Biochemistry';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Biochemistry'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'RIQAS', 'Immunosuppressant program', '11A & 11B', '2026-03-09', '2027-02-16')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Cyclosporin', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Tacrolimus', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Clinical Pathology';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Clinical Pathology'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Urinalysis Program', '11', '2026-03-11', '2027-02-10')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Infectious Serology';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Infectious Serology'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'HIV/Hepatitis program', '11', '2026-03-18', '2027-02-17')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'HBs Ag', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'HCV Ab, Total', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'HIV Ag-Ab', 3) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'HAV Ab, IgM', 4) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'HBc Ab, IgM', 5) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'HBe Ag', 6) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'HBe Ab, Total', 7) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'HBc Ab, Total', 8) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'HBs Ab, Total-Unit', 9) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

  SELECT id INTO v_lab_id FROM laboratories WHERE name = 'Infectious Serology';
  IF v_lab_id IS NULL THEN RAISE NOTICE 'Lab not found, skipping: Infectious Serology'; ELSE
    INSERT INTO eqa_programs (laboratory_id, provider, program_name, cycle, start_date, end_date)
    VALUES (v_lab_id, 'Biorad', 'Torch/EBV/MunZ program', '11', '2026-03-03', '2027-02-02')
    ON CONFLICT (laboratory_id, provider, program_name, cycle) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
    RETURNING id INTO v_program_id;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'CMV Ab, IgG', 1) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'CMV Ab, IgM', 2) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Rubella Ab, IgG', 3) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'Rubella Ab, IgM', 4) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'T.gondii Ab,IgG', 5) ON CONFLICT (program_id, analyte) DO NOTHING;
    INSERT INTO eqa_program_analytes (program_id, analyte, sort_order) VALUES (v_program_id, 'T.gondii Ab,IgM', 6) ON CONFLICT (program_id, analyte) DO NOTHING;
  END IF;

END $$;
