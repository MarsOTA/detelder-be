-- Apply manually to Aiven TEST after a backup and before enabling ADMIN_HR assignments.
-- This file is deliberately not executed automatically or against OVH production.
ALTER TABLE hr_ruoli_assegnati
  MODIFY COLUMN ruolo ENUM('ADMIN','HR','ADMIN_HR') NOT NULL;
