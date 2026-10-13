CREATE TABLE "plan_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planId" uuid NOT NULL,
	"userId" text NOT NULL,
	"version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"reason" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plan_revision_plan_version" UNIQUE("planId","version")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"userId" text PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"salaryDay" integer,
	"emailReminders" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scenario" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "baselineRevisionId" uuid;--> statement-breakpoint
ALTER TABLE "scenario" ADD COLUMN "levers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_revision" ADD CONSTRAINT "plan_revision_planId_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_revision" ADD CONSTRAINT "plan_revision_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_revision_user_created" ON "plan_revision" USING btree ("userId","createdAt");