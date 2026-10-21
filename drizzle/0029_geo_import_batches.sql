CREATE TABLE "geo_import_batches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"format_version" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"sources" jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"snapshot_sha256" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rolled_back_at" timestamp with time zone,
	CONSTRAINT "geo_import_batches_version_check" CHECK ("geo_import_batches"."format_version" = 1),
	CONSTRAINT "geo_import_batches_status_check" CHECK ("geo_import_batches"."status" in ('imported', 'rolled_back')),
	CONSTRAINT "geo_import_batches_rollback_time_check" CHECK (("geo_import_batches"."status" = 'imported' and "geo_import_batches"."rolled_back_at" is null) or ("geo_import_batches"."status" = 'rolled_back' and "geo_import_batches"."rolled_back_at" is not null)),
	CONSTRAINT "geo_import_batches_snapshot_check" CHECK (jsonb_typeof("geo_import_batches"."snapshot") = 'object'),
	CONSTRAINT "geo_import_batches_sources_check" CHECK (jsonb_typeof("geo_import_batches"."sources") = 'array'),
	CONSTRAINT "geo_import_batches_hash_check" CHECK ("geo_import_batches"."snapshot_sha256" ~ '^[0-9a-f]{64}$')
);
