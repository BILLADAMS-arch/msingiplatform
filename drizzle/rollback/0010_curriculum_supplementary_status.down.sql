-- Rollback for 0010_curriculum_supplementary_status. Run manually (drizzle-kit
-- has no down migrations). Postgres cannot DROP an enum value, so the type is
-- recreated without it. Refuses to run while any mapping still uses the value
-- (re-classify those rows first); nothing else is touched.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "curriculum_mappings" WHERE "match_status" = 'supplementary') THEN
    RAISE EXCEPTION 'curriculum_mappings still has rows with match_status = supplementary; re-classify them first';
  END IF;
END $$;
ALTER TYPE "curriculum_match_status" RENAME TO "curriculum_match_status_old";
CREATE TYPE "curriculum_match_status" AS ENUM ('exact', 'probable', 'needs_review', 'no_match');
ALTER TABLE "curriculum_mappings" ALTER COLUMN "match_status" TYPE "curriculum_match_status" USING "match_status"::text::"curriculum_match_status";
DROP TYPE "curriculum_match_status_old";
-- Forget exactly this migration (matched by its journal timestamp) so it can be re-applied.
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791272695259;
COMMIT;
