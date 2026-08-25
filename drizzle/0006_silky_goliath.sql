ALTER TABLE "mistakes" ADD COLUMN "chosen_text" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "answer_text" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "answer_numeric" double precision;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "answer_tolerance" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "test_answers" ADD COLUMN "chosen_text" text;