import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Always create a new isolated local cluster. No hosted URL, .env, user database,
// or existing Docker volume is accepted by this test runner.
const root = fileURLToPath(new URL('../', import.meta.url));
const bin = process.env.PG_BIN ?? (existsSync('/opt/homebrew/opt/postgresql@17/bin') ? '/opt/homebrew/opt/postgresql@17/bin' : '');
const exe = name => bin ? join(bin, name) : name;
const directory = mkdtempSync(join(tmpdir(), 'homehuddle-db-test-'));
const data = join(directory, 'data');
const port = String(54000 + Math.floor(Math.random() * 1000));
const run = (name, args, options = {}) => execFileSync(exe(name), args, { cwd: root, stdio: 'inherit', ...options });
let started = false;
try {
  run('initdb', ['-D', data, '-A', 'trust', '--no-locale', '-E', 'UTF8', ...(process.env.PG_SHAREDIR ? ['-L', process.env.PG_SHAREDIR] : [])]);
  run('pg_ctl', ['-D', data, '-l', join(directory, 'server.log'), '-o', `-p ${port} -h 127.0.0.1 -k ${directory} -c wal_level=logical`, '-w', 'start']);
  started = true;
  const sql = file => run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', port, '-d', 'postgres', '-f', resolve(root, file)]);
  sql('supabase/tests/bootstrap.sql');
  for (const migration of readdirSync(join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort()) {
    console.log(`Applying ${migration}`);
    sql(join('supabase/migrations', migration));
  }
  sql('supabase/tests/integrity.sql');
  sql('supabase/tests/planning.sql');
  sql('supabase/tests/routines.sql');
  sql('supabase/tests/billing.sql');
  console.log('Database migration and integrity tests passed (PostgreSQL harness; Supabase services not emulated).');
} finally {
  if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  // This is exclusively the temporary directory created above by this process.
  if (process.env.KEEP_TEST_DB === 'true') console.log(`Test logs retained: ${directory}`);
  else rmSync(directory, { recursive: true, force: true });
}
