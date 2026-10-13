CREATE TABLE "events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"visit" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "share_id" text;--> statement-breakpoint
CREATE INDEX "events_name_created_at_idx" ON "events" USING btree ("name","created_at");--> statement-breakpoint
CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_share_id_unique" UNIQUE("share_id");