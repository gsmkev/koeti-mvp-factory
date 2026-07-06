ALTER TABLE "teams" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "measurement_system" varchar(10) DEFAULT 'metric' NOT NULL;