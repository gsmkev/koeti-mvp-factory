CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"order_ref" text NOT NULL,
	"cdc" varchar(44),
	"number" varchar(20),
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_order_ref_unique" UNIQUE("order_ref")
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;