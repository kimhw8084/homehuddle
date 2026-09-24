import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
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
  sql('supabase/tests/market-wallet.sql');
  // Real, independent connections exercise contention that the WASM harness
  // cannot simulate. This cluster was created by this process, never hosted.
  const connection = ['-X', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', port, '-d', 'postgres'];
  const query = text => execFileSync(exe('psql'), [...connection, '-At', '-c', text], { encoding: 'utf8' }).trim();
  const owner = JSON.parse(query("select row_to_json(m) from (select id,household_id from public.household_members where auth_user_id='00000000-0000-4000-8000-000000000001') m"));
  const reward = randomUUID();
  query(`update public.household_members set wallet_balance=500 where id='${owner.id}'; insert into public.rewards(id,household_id,title,cost,stock) values('${reward}','${owner.household_id}','Concurrency fixture',20,1);`);
  const purchase = request => promisify(execFile)(exe('psql'), [...connection, '-At', '-c', `set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'; select public.purchase_reward_v2('${reward}','${owner.id}','${request}',20);`]);
  const outcomes = await Promise.allSettled([purchase(randomUUID()), purchase(randomUUID())]);
  if (outcomes.filter(result => result.status === 'fulfilled').length !== 1) throw new Error('Concurrent buyers did not serialize the last stock unit');
  if (query(`select wallet_balance=480 from public.household_members where id='${owner.id}'`) !== 't') throw new Error('Concurrent stock race changed balance incorrectly');
  console.log('PASS: concurrent buyers cannot oversell or double-debit the last unit');
  query(`update public.rewards set stock=2 where id='${reward}'`);
  const request = randomUUID();
  const replay = await Promise.all([purchase(request), purchase(request)]);
  if (replay[0].stdout !== replay[1].stdout || query(`select wallet_balance=460 from public.household_members where id='${owner.id}'`) !== 't' || query(`select stock=1 from public.rewards where id='${reward}'`) !== 't') throw new Error('Concurrent replay was not exactly once');
  console.log('PASS: simultaneous retries return one purchase and debit once');
  console.log('Database migration and integrity tests passed (PostgreSQL harness; Supabase services not emulated).');
} finally {
  if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  // This is exclusively the temporary directory created above by this process.
  if (process.env.KEEP_TEST_DB === 'true') console.log(`Test logs retained: ${directory}`);
  else rmSync(directory, { recursive: true, force: true });
}
