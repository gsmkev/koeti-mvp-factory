CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" varchar(100) NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
