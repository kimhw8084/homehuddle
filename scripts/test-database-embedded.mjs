import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Portable PostgreSQL/WASM regression harness. Never connects to a hosted DB.
// Native concurrency and Supabase service integration remain separate gates.
const root = fileURLToPath(new URL('../', import.meta.url));
let assertions = 0;
const noticeOptions = { onNotice: notice => {
  if (notice.message.startsWith('PASS:')) { assertions++; console.log(notice.message); }
} };
const db = new PGlite({ extensions: { pgcrypto } });
const read = file => readFileSync(join(root, file), 'utf8');
async function sql(file) {
  console.log(`Testing ${file}`);
  try { await db.exec(read(file)); }
  catch (error) { console.error(`Failed in ${file}: ${error.message}`); throw error; }
}
async function psqlTest(file) {
  // Only the psql conveniences used by these fixtures: quoted variables and
  // \gset. Each block otherwise executes unchanged as real PostgreSQL SQL.
  const variables = new Map();
  let buffer = '';
  const replace = value => value.replace(/:'([a-z_]+)'/g, (_, key) => {
    if (!variables.has(key)) throw new Error(`Unknown fixture variable ${key}`);
    return `'${String(variables.get(key)).replaceAll("'", "''")}'`;
  });
  for (const line of read(file).split('\n')) {
    buffer += line.replace('\\gset', '') + '\n';
    if (line.includes('\\gset')) {
      const result = await db.exec(replace(buffer), noticeOptions);
      Object.entries(result.at(-1).rows[0]).forEach(([key, value]) => variables.set(key, value));
      buffer = '';
    }
  }
  if (buffer.trim()) await db.exec(replace(buffer), noticeOptions);
}
try {
  await sql('supabase/tests/bootstrap.sql');
  for (const file of readdirSync(join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort()) await sql(`supabase/migrations/${file}`);
  await psqlTest('supabase/tests/integrity.sql');
  await psqlTest('supabase/tests/planning.sql');
  await psqlTest('supabase/tests/routines.sql');
  await psqlTest('supabase/tests/billing.sql');
  console.log(`All PostgreSQL/WASM migration and policy regression tests passed (${assertions} assertions).`);
} catch (error) {
  console.error(error.message);
  if (error.where) console.error(error.where);
  process.exitCode = 1;
} finally { await db.close(); }
