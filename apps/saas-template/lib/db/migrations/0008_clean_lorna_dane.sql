ALTER TABLE "teams" ADD COLUMN "tax_document_type" varchar(3) DEFAULT 'CI' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "tax_id" varchar(20);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "business_name" varchar(100);