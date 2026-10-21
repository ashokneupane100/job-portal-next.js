CREATE TYPE "role" AS ENUM('admin', 'applicant', 'employer');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY,
	"user_id" integer NOT NULL,
	"user_agent" text NOT NULL,
	"ip" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL UNIQUE,
	"password" text NOT NULL,
	"email" varchar(255) UNIQUE,
	"role" "role" DEFAULT 'applicant'::"role" NOT NULL,
	"phone_number" varchar(18) NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;