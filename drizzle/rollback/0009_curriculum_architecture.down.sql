-- Rollback for 0009_curriculum_architecture. Run manually (drizzle-kit has no
-- down migrations). Removes ONLY what 0009 added; Msingi content and learner
-- data are not touched. Run inside a transaction.
BEGIN;
DROP TABLE IF EXISTS "curriculum_mappings";
DROP TABLE IF EXISTS "curriculum_sub_strands";
DROP TABLE IF EXISTS "curriculum_strands";
DROP TABLE IF EXISTS "curriculum_subjects";
DROP TABLE IF EXISTS "source_document_grades";
DROP TABLE IF EXISTS "source_documents";
DROP TABLE IF EXISTS "curriculum_pathways";
DROP TABLE IF EXISTS "curriculum_grade_levels";
DROP TABLE IF EXISTS "curriculum_levels";
DROP TABLE IF EXISTS "curriculum_versions";
DROP TABLE IF EXISTS "curriculum_frameworks";
DROP INDEX IF EXISTS "subjects_grade_code_unique";
ALTER TABLE "subjects" DROP COLUMN IF EXISTS "code";
ALTER TABLE "grades" DROP CONSTRAINT IF EXISTS "grades_code_unique";
ALTER TABLE "grades" DROP COLUMN IF EXISTS "code";
DROP TYPE IF EXISTS "curriculum_match_status";
DROP TYPE IF EXISTS "curriculum_status";
DROP TYPE IF EXISTS "curriculum_subject_category";
DROP TYPE IF EXISTS "source_access";
-- Forget exactly this migration (matched by its journal timestamp), so it can be re-applied.
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791192427427;
COMMIT;
