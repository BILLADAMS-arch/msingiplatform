CREATE TABLE "playground_activity_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"first_used_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playground_activity_progress_user_id_activity_id_unique" UNIQUE("user_id","activity_id")
);
--> statement-breakpoint
ALTER TABLE "playground_activities" ADD COLUMN "slug" varchar(60);--> statement-breakpoint
ALTER TABLE "playground_activity_progress" ADD CONSTRAINT "playground_activity_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playground_activity_progress" ADD CONSTRAINT "playground_activity_progress_activity_id_playground_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."playground_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playground_activities" ADD CONSTRAINT "playground_activities_slug_unique" UNIQUE("slug");