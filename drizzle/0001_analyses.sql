CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"category" text NOT NULL,
	"department" text,
	"region" text,
	"verdict" text NOT NULL,
	"result" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"llm_cost_usd" double precision,
	"llm_input_tokens" integer DEFAULT 0 NOT NULL,
	"llm_output_tokens" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_lines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "price_lines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"analysis_id" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"category" text NOT NULL,
	"department" text,
	"region" text,
	"label" text NOT NULL,
	"canonical_item" text,
	"quantity" double precision,
	"unit" text,
	"unit_price_ht" double precision,
	"total_ht" double precision,
	"vat_rate" double precision,
	"confidence" text NOT NULL,
	"comparable" boolean DEFAULT false NOT NULL,
	"comparable_unit" text,
	"comparable_price" double precision,
	"fingerprint" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_lines" ADD CONSTRAINT "price_lines_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyses_expires_at_idx" ON "analyses" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "analyses_created_at_idx" ON "analyses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "price_lines_lookup_idx" ON "price_lines" USING btree ("canonical_item","region","created_at");--> statement-breakpoint
CREATE INDEX "price_lines_analysis_idx" ON "price_lines" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "price_lines_fingerprint_idx" ON "price_lines" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "price_lines_created_at_idx" ON "price_lines" USING btree ("created_at");