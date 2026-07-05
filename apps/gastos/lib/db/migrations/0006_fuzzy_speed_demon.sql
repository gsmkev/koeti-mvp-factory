ALTER TABLE "teams" ADD COLUMN "onboarding_completed_at" timestamp;
--> statement-breakpoint
-- Existing teams predate onboarding: treat them as done so owners are not bounced.
UPDATE "teams" SET "onboarding_completed_at" = now();