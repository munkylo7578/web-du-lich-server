import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// Deliberately no FKs to imported rows: retain this audit record after rollback.
export const geoImportBatches = pgTable('geo_import_batches', {
  id: uuid('id').primaryKey(),
  formatVersion: integer('format_version').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  sources: jsonb('sources').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  snapshotSha256: varchar('snapshot_sha256', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  rolledBackAt: timestamp('rolled_back_at', { withTimezone: true }),
}, (table) => [
  check('geo_import_batches_version_check', sql`${table.formatVersion} = 1`),
  check('geo_import_batches_status_check', sql`${table.status} in ('imported', 'rolled_back')`),
  check('geo_import_batches_rollback_time_check', sql`(${table.status} = 'imported' and ${table.rolledBackAt} is null) or (${table.status} = 'rolled_back' and ${table.rolledBackAt} is not null)`),
  check('geo_import_batches_snapshot_check', sql`jsonb_typeof(${table.snapshot}) = 'object'`),
  check('geo_import_batches_sources_check', sql`jsonb_typeof(${table.sources}) = 'array'`),
  check('geo_import_batches_hash_check', sql`${table.snapshotSha256} ~ '^[0-9a-f]{64}$'`),
]);
