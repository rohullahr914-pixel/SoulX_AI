-- One-time cleanup for databases that ran the pre-Supabase migrations.
-- New installs have no effect because these tables are never created by 001.
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schema_migrations_legacy CASCADE;
