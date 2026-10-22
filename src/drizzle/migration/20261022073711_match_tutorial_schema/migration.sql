ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_number" SET DATA TYPE varchar(255) USING "phone_number"::varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_number" DROP NOT NULL;