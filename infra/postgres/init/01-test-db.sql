-- Runs once, on first start of an empty volume.
-- Test database for API e2e runs (trd §12). Extensions (pg_trgm, unaccent) are created by
-- Prisma migrations in packages/db, not here, so migration history matches the database.
CREATE DATABASE talent_test OWNER talent;
