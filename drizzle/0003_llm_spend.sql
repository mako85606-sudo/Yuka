CREATE TABLE "llm_spend" (
	"day" date PRIMARY KEY NOT NULL,
	"usd" double precision DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
