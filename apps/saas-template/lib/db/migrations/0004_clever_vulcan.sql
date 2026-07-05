CREATE TABLE "ai_usage" (
	"team_id" integer NOT NULL,
	"day" date NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_usage_team_id_day_pk" PRIMARY KEY("team_id","day")
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"kind" varchar(20) NOT NULL,
	"severity" varchar(10) DEFAULT 'info' NOT NULL,
	"message_key" varchar(100) NOT NULL,
	"params" text DEFAULT '{}' NOT NULL,
	"dedupe_key" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"dismissed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "ai_daily_limit" integer;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "insights_team_dedupe_idx" ON "insights" USING btree ("team_id","dedupe_key");