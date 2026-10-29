CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(320) NOT NULL,
  "display_name" varchar(120) NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");
--> statement-breakpoint
CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" varchar(64) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "absolute_expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" ("token_hash");
CREATE INDEX "sessions_user_id_index" ON "sessions" ("user_id");
CREATE INDEX "sessions_expires_at_index" ON "sessions" ("expires_at");
--> statement-breakpoint
CREATE TABLE "forms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "key" varchar(120) NOT NULL,
  "title" varchar(200) NOT NULL,
  "draft_schema" jsonb NOT NULL,
  "draft_revision" integer DEFAULT 1 NOT NULL,
  "current_published_version" integer,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "forms_owner_key_active_unique"
  ON "forms" ("owner_id", "key") WHERE "deleted_at" IS NULL;
CREATE INDEX "forms_owner_updated_index" ON "forms" ("owner_id", "updated_at");
CREATE INDEX "forms_owner_deleted_index" ON "forms" ("owner_id", "deleted_at");
--> statement-breakpoint
CREATE TABLE "form_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "schema_version" integer NOT NULL,
  "schema" jsonb NOT NULL,
  "published_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "published_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "form_versions_form_version_unique" UNIQUE("form_id", "version")
);
--> statement-breakpoint
CREATE INDEX "form_versions_form_published_index"
  ON "form_versions" ("form_id", "published_at");
--> statement-breakpoint
ALTER TABLE "forms"
  ADD CONSTRAINT "forms_current_published_version_fk"
  FOREIGN KEY ("id", "current_published_version")
  REFERENCES "form_versions" ("form_id", "version")
  DEFERRABLE INITIALLY DEFERRED;

