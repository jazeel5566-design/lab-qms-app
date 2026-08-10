-- 0010_seed_clause_status.sql
-- clause_status was designed to be populated lazily — a row only gets
-- created the first time someone edits that clause in the Clause Register.
-- That's fine for the register itself, but NC/CAPA and the Risk Register
-- both let you link to ANY of the 34 clauses, and the database enforces
-- that a linked clause must already exist as a real row. Picking a clause
-- nobody has touched yet fails with a foreign key error.
--
-- Fix: seed all 34 clauses up front, defaulting to 'Not assessed' — exactly
-- what an untouched clause already shows in the UI, so this changes nothing
-- visible, it just makes every clause always linkable.
-- Safe to rerun: "on conflict do nothing" means it will never overwrite a
-- clause someone has already assessed.

insert into clause_status (clause_id) values
  ('4.1'), ('4.2'), ('4.3'),
  ('5.1'), ('5.2'), ('5.3'), ('5.4'), ('5.5'), ('5.6'), ('5.7'),
  ('6.1'), ('6.2'), ('6.3'), ('6.4'), ('6.5'), ('6.6'), ('6.7'),
  ('7.1'), ('7.2'), ('7.3'), ('7.4'), ('7.5'), ('7.6'), ('7.7'), ('7.8'),
  ('8.1'), ('8.2'), ('8.3'), ('8.4'), ('8.5'), ('8.6'), ('8.7'), ('8.8'), ('8.9')
on conflict (clause_id) do nothing;
