import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

// A limited current-source guard, not a historical secret audit or DLP system.
// Report paths only, never matching credentials or source lines.
const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const findings = [];
for (const path of paths) {
  if (/(^|\/)(\.env(\..+)?|claude\.txt|chores_split_[a-z]+)$/.test(path) && !path.endsWith('.env.example')) {
    findings.push(`${path}: local-only file is tracked`);
  }
  if (!existsSync(path)) continue;
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  const source = bytes.toString('utf8');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sb_secret_[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}/.test(source)) {
    findings.push(`${path}: possible credential; review privately`);
  }
  for (const match of source.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      if (JSON.parse(Buffer.from(match[1], 'base64url').toString()).role === 'service_role') findings.push(`${path}: possible privileged JWT`);
    } catch { /* Not a JWT payload. */ }
  }
}
if (findings.length) { console.error([...new Set(findings)].join('\n')); process.exitCode = 1; }
else console.log('Tracked-source hygiene check passed. Historical commits and untracked files were not scanned.');
