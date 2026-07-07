CREATE TABLE "team_slugs" (
	"slug" varchar(60) PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	CONSTRAINT "team_slugs_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
ALTER TABLE "team_slugs" ADD CONSTRAINT "team_slugs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;