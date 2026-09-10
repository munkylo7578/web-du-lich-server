// Read-only migration diagnostics. Run from the repository root on the affected server.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const postgres = require('postgres');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    connection: {
      application_name: 'read-only-migration-diagnostics',
      default_transaction_read_only: 'on',
      statement_timeout: 8000,
      lock_timeout: 3000,
    },
    onnotice: (notice) => console.log('[notice]', notice.code, notice.message),
  });

  async function inspect(label, query) {
    console.log(`\n[${label}] starting`);
    try {
      const rows = await sql.unsafe(query);
      console.log(JSON.stringify(rows, null, 2));
      return rows;
    } catch (error) {
      // Do not print connection URLs, query text, parameters, or row contents from errors.
      console.error(`[${label}]`, JSON.stringify({ code: error.code, message: error.message }));
      process.exitCode = 1;
      return [];
    }
  }

  try {
    await inspect('connection', `select current_setting('transaction_read_only') as read_only,
      current_setting('statement_timeout') as statement_timeout, current_schema() as current_schema`);
    const history = await inspect('migration history', `select id, hash, created_at
      from drizzle.__drizzle_migrations order by created_at desc limit 20`);
    const folder = path.resolve(__dirname, '../drizzle');
    const journal = JSON.parse(fs.readFileSync(path.join(folder, 'meta/_journal.json'), 'utf8'));
    const latest = history.reduce((value, row) => Math.max(value, Number(row.created_at)), 0);
    console.log('\n[local migration files compared with database history]');
    console.log(JSON.stringify(journal.entries.map((entry) => {
      const filename = path.join(folder, `${entry.tag}.sql`);
      const exists = fs.existsSync(filename);
      const hash = exists ? crypto.createHash('sha256').update(fs.readFileSync(filename, 'utf8')).digest('hex') : null;
      return {
        tag: entry.tag,
        timestamp: entry.when,
        fileExists: exists,
        newerThanLatestApplied: latest ? entry.when > latest : null,
        matchesRecentHistoryHash: history.some((row) => row.hash === hash),
      };
    }), null, 2));
    await inspect('destination columns', `select table_schema, column_name, data_type, is_nullable, column_default
      from information_schema.columns where table_name = 'destinations' order by table_schema, ordinal_position`);
    await inspect('destination has existing rows', `select exists(select 1 from public.destinations limit 1) as has_rows`);
    await inspect('destination constraints', `select conname, pg_get_constraintdef(oid) as definition
      from pg_constraint where conrelid = to_regclass('public.destinations')`);
    await inspect('destination table permissions', `select
      pg_has_role(current_user, relowner, 'MEMBER') as member_of_owner_role
      from pg_class where oid = to_regclass('public.destinations')`);
    await inspect('active sessions and blocking (no query text)', `select pid, application_name, state,
      wait_event_type, wait_event, pg_blocking_pids(pid) as blocking_pids,
      now() - xact_start as transaction_age, now() - query_start as query_age
      from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid()
      and (state is distinct from 'idle' or cardinality(pg_blocking_pids(pid)) > 0)
      order by query_start limit 30`);
    console.log('\n[done] No schema or data changes were made. Session visibility depends on database permissions.');
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((error) => {
  console.error('[diagnostic failed]', JSON.stringify({ code: error.code, message: error.message }));
  process.exitCode = 1;
});
