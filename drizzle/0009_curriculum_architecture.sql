	CREATE TYPE "public"."curriculum_match_status" AS ENUM('exact', 'probable', 'needs_review', 'no_match');--> statement-breakpoint
	CREATE TYPE "public"."curriculum_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
	CREATE TYPE "public"."curriculum_subject_category" AS ENUM('core', 'pathway', 'optional', 'general');--> statement-breakpoint
	CREATE TYPE "public"."source_access" AS ENUM('viewable', 'restricted', 'downloadable', 'unknown');--> statement-breakpoint
	CREATE TABLE "curriculum_frameworks" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"code" varchar(40) NOT NULL,
		"name" varchar(160) NOT NULL,
		"authority" varchar(160) NOT NULL,
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL,
		CONSTRAINT "curriculum_frameworks_code_unique" UNIQUE("code")
	);
	--> statement-breakpoint
	CREATE TABLE "curriculum_grade_levels" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"version_id" uuid NOT NULL,
		"level_id" uuid NOT NULL,
		"grade_id" uuid NOT NULL,
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL,
		CONSTRAINT "curriculum_grade_levels_version_grade_unique" UNIQUE("version_id","grade_id")
	);
	--> statement-breakpoint
	CREATE TABLE "curriculum_levels" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"version_id" uuid NOT NULL,
		"code" varchar(40) NOT NULL,
		"name" varchar(120) NOT NULL,
		"sort_order" integer DEFAULT 0 NOT NULL,
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL,
		CONSTRAINT "curriculum_levels_version_code_unique" UNIQUE("version_id","code")
	);
	--> statement-breakpoint
	CREATE TABLE "curriculum_mappings" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"version_id" uuid NOT NULL,
		"subject_id" uuid,
		"strand_id" uuid,
		"sub_strand_id" uuid,
		"topic_id" uuid,
		"curriculum_subject_id" uuid,
		"curriculum_strand_id" uuid,
		"curriculum_sub_strand_id" uuid,
		"match_status" "curriculum_match_status" NOT NULL,
		"notes" text,
		"reviewed_by" uuid,
		"reviewed_at" timestamp,
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL,
		CONSTRAINT "curriculum_mappings_one_target" CHECK (num_nonnulls("curriculum_mappings"."subject_id", "curriculum_mappings"."strand_id", "curriculum_mappings"."sub_strand_id", "curriculum_mappings"."topic_id") = 1)
	);
	--> statement-breakpoint
	CREATE TABLE "curriculum_pathways" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"version_id" uuid NOT NULL,
		"level_id" uuid NOT NULL,
		"code" varchar(60) NOT NULL,
		"name" varchar(160) NOT NULL,
		"sort_order" integer DEFAULT 0 NOT NULL,
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL,
		CONSTRAINT "curriculum_pathways_version_code_unique" UNIQUE("version_id","code")
	);
	--> statement-breakpoint
	CREATE TABLE "curriculum_strands" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"curriculum_subject_id" uuid NOT NULL,
		"number" varchar(10) NOT NULL,
		"name" varchar(200) NOT NULL,
		"sort_order" integer DEFAULT 0 NOT NULL,
		"source_page" varchar(10),
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL,
		CONSTRAINT "curriculum_strands_subject_number_unique" UNIQUE("curriculum_subject_id","number")
	);
	--> statement-breakpoint
	CREATE TABLE "curriculum_sub_strands" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"strand_id" uuid NOT NULL,
		"number" varchar(10) NOT NULL,
		"name" varchar(200) NOT NULL,
		"suggested_lessons" integer,
		"sort_order" integer DEFAULT 0 NOT NULL,
		"source_page" varchar(10),
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL,
		CONSTRAINT "curriculum_sub_strands_strand_number_unique" UNIQUE("strand_id","number")
	);
	--> statement-breakpoint
	CREATE TABLE "curriculum_subjects" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"version_id" uuid NOT NULL,
		"grade_id" uuid NOT NULL,
		"level_id" uuid NOT NULL,
		"code" varchar(80) NOT NULL,
		"name" varchar(200) NOT NULL,
		"category" "curriculum_subject_category" DEFAULT 'general' NOT NULL,
		"pathway_id" uuid,
		"is_optional" boolean DEFAULT false NOT NULL,
		"status" "curriculum_status" DEFAULT 'active' NOT NULL,
		"source_document_id" uuid,
		"sort_order" integer DEFAULT 0 NOT NULL,
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL,
		CONSTRAINT "curriculum_subjects_version_grade_code_unique" UNIQUE("version_id","grade_id","code")
	);
	--> statement-breakpoint
	CREATE TABLE "curriculum_versions" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"framework_id" uuid NOT NULL,
		"code" varchar(80) NOT NULL,
		"label" varchar(200) NOT NULL,
		"status" "curriculum_status" DEFAULT 'draft' NOT NULL,
		"effective_from" date,
		"notes" text,
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL,
		CONSTRAINT "curriculum_versions_framework_code_unique" UNIQUE("framework_id","code")
	);
	--> statement-breakpoint
	CREATE TABLE "source_document_grades" (
		"source_document_id" uuid NOT NULL,
		"grade_id" uuid NOT NULL,
		CONSTRAINT "source_document_grades_source_document_id_grade_id_pk" PRIMARY KEY("source_document_id","grade_id")
	);
	--> statement-breakpoint
	CREATE TABLE "source_documents" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"version_id" uuid NOT NULL,
		"kicd_page_url" text NOT NULL,
		"drive_file_id" varchar(100),
		"official_title" text,
		"learning_area_label" varchar(200),
		"isbn" varchar(32),
		"first_published" varchar(40),
		"revision_label" varchar(80),
		"retrieved_at" timestamp NOT NULL,
		"access_status" "source_access" DEFAULT 'unknown' NOT NULL,
		"download_allowed" boolean,
		"is_draft" boolean,
		"notes" text,
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL,
		CONSTRAINT "source_documents_version_drive_unique" UNIQUE("version_id","drive_file_id")
	);
	--> statement-breakpoint
	ALTER TABLE "grades" ADD COLUMN "code" varchar(20);--> statement-breakpoint
	ALTER TABLE "subjects" ADD COLUMN "code" varchar(80);--> statement-breakpoint
	ALTER TABLE "curriculum_grade_levels" ADD CONSTRAINT "curriculum_grade_levels_version_id_curriculum_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_grade_levels" ADD CONSTRAINT "curriculum_grade_levels_level_id_curriculum_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."curriculum_levels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_grade_levels" ADD CONSTRAINT "curriculum_grade_levels_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_levels" ADD CONSTRAINT "curriculum_levels_version_id_curriculum_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_version_id_curriculum_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_strand_id_strands_id_fk" FOREIGN KEY ("strand_id") REFERENCES "public"."strands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_sub_strand_id_sub_strands_id_fk" FOREIGN KEY ("sub_strand_id") REFERENCES "public"."sub_strands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_curriculum_subject_id_curriculum_subjects_id_fk" FOREIGN KEY ("curriculum_subject_id") REFERENCES "public"."curriculum_subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_curriculum_strand_id_curriculum_strands_id_fk" FOREIGN KEY ("curriculum_strand_id") REFERENCES "public"."curriculum_strands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_curriculum_sub_strand_id_curriculum_sub_strands_id_fk" FOREIGN KEY ("curriculum_sub_strand_id") REFERENCES "public"."curriculum_sub_strands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_pathways" ADD CONSTRAINT "curriculum_pathways_version_id_curriculum_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_pathways" ADD CONSTRAINT "curriculum_pathways_level_id_curriculum_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."curriculum_levels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_strands" ADD CONSTRAINT "curriculum_strands_curriculum_subject_id_curriculum_subjects_id_fk" FOREIGN KEY ("curriculum_subject_id") REFERENCES "public"."curriculum_subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_sub_strands" ADD CONSTRAINT "curriculum_sub_strands_strand_id_curriculum_strands_id_fk" FOREIGN KEY ("strand_id") REFERENCES "public"."curriculum_strands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_version_id_curriculum_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_level_id_curriculum_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."curriculum_levels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_pathway_id_curriculum_pathways_id_fk" FOREIGN KEY ("pathway_id") REFERENCES "public"."curriculum_pathways"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_framework_id_curriculum_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."curriculum_frameworks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "source_document_grades" ADD CONSTRAINT "source_document_grades_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "source_document_grades" ADD CONSTRAINT "source_document_grades_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_version_id_curriculum_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
	CREATE INDEX "curriculum_grade_levels_level_idx" ON "curriculum_grade_levels" USING btree ("level_id");--> statement-breakpoint
	CREATE UNIQUE INDEX "curriculum_mappings_subject_unique" ON "curriculum_mappings" USING btree ("version_id","subject_id") WHERE "curriculum_mappings"."subject_id" is not null;--> statement-breakpoint
	CREATE UNIQUE INDEX "curriculum_mappings_strand_unique" ON "curriculum_mappings" USING btree ("version_id","strand_id") WHERE "curriculum_mappings"."strand_id" is not null;--> statement-breakpoint
	CREATE UNIQUE INDEX "curriculum_mappings_sub_strand_unique" ON "curriculum_mappings" USING btree ("version_id","sub_strand_id") WHERE "curriculum_mappings"."sub_strand_id" is not null;--> statement-breakpoint
	CREATE UNIQUE INDEX "curriculum_mappings_topic_unique" ON "curriculum_mappings" USING btree ("version_id","topic_id") WHERE "curriculum_mappings"."topic_id" is not null;--> statement-breakpoint
	CREATE INDEX "curriculum_subjects_grade_idx" ON "curriculum_subjects" USING btree ("grade_id");--> statement-breakpoint
	CREATE UNIQUE INDEX "subjects_grade_code_unique" ON "subjects" USING btree ("grade_id","code") WHERE "subjects"."code" is not null;--> statement-breakpoint
	ALTER TABLE "grades" ADD CONSTRAINT "grades_code_unique" UNIQUE("code");--> statement-breakpoint
	-- Backfill stable grade codes (identity) from the existing display names.
	-- Only fills NULLs, so re-running is harmless.
	UPDATE "grades" SET "code" = CASE
	  WHEN "name" ~ '^PP ?[12]$' THEN regexp_replace("name", ' ', '', 'g')
	  WHEN "name" ~ '^Grade [0-9]{1,2}$' THEN 'G' || substring("name" from '[0-9]{1,2}')
	  ELSE NULL END
	WHERE "code" IS NULL;--> statement-breakpoint
	-- Backfill Msingi subject codes from current names (e.g. "Science & Technology"
	-- -> SCIENCE_AND_TECHNOLOGY). Names stay as display values; logic uses codes.
	UPDATE "subjects" SET "code" = trim(both '_' from regexp_replace(upper(replace("name", '&', ' AND ')), '[^A-Z0-9]+', '_', 'g'))
	WHERE "code" IS NULL;
