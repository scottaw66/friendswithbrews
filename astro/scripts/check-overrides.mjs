#!/usr/bin/env node
// Checks whether each entry in package.json "overrides" is still doing
// anything. For each override, it recomputes the dependency tree WITHOUT
// that pin (in a throwaway temp dir, never touching this repo) and audits
// it. If the package no longer shows up as vulnerable on its own, the pin
// is dead weight and you can delete it.
//
// Run manually any time:  npm run check:overrides
// Also runs automatically on `git push` via .githooks/pre-push
//
// Never fails / never blocks — worst case it prints a warning and exits 0.

import { readFileSync, writeFileSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
let pkg;
try {
  pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
} catch {
  process.exit(0); // no package.json here, nothing to do
}

const overrides = pkg.overrides ?? {};
const keys = Object.keys(overrides);
if (keys.length === 0) process.exit(0);

function auditTree(dir) {
  // npm audit exits non-zero when vulns exist; the JSON is still on stdout.
  let out;
  try {
    out = execFileSync('npm', ['audit', '--json'], { cwd: dir, encoding: 'utf8' });
  } catch (e) {
    if (e.stdout) out = e.stdout;
    else throw e;
  }
  return JSON.parse(out);
}

const removable = [];
const stillNeeded = [];

for (const key of keys) {
  const trimmed = { ...overrides };
  delete trimmed[key];

  const testPkg = { ...pkg };
  if (Object.keys(trimmed).length) testPkg.overrides = trimmed;
  else delete testPkg.overrides;

  const dir = mkdtempSync(join(tmpdir(), 'ovchk-'));
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify(testPkg, null, 2));
    copyFileSync(join(root, 'package-lock.json'), join(dir, 'package-lock.json'));

    // Recompute the lockfile only — no downloads into node_modules, no scripts.
    execFileSync(
      'npm',
      ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--silent'],
      { cwd: dir, stdio: 'ignore' }
    );

    const report = auditTree(dir);
    const vulnerable = report.vulnerabilities ?? {};
    // If the pinned package no longer appears as vulnerable without its pin,
    // the natural tree has caught up and the override is redundant.
    if (!vulnerable[key]) removable.push(key);
    else stillNeeded.push(key);
  } catch {
    // Offline / npm hiccup — don't nag, don't block.
    process.stderr.write(`check-overrides: skipped '${key}' (couldn't resolve, probably offline)\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (removable.length) {
  process.stderr.write('\n[32m[1m🎉 npm overrides that are now SAFE TO DELETE from package.json:[0m\n');
  for (const k of removable) {
    process.stderr.write(`   • "${k}" — the dependency tree already resolves to a patched version.\n`);
  }
  process.stderr.write('   Remove the line(s) from "overrides", run `npm install`, then `npm audit` to confirm 0 vulns.\n\n');
} else if (stillNeeded.length) {
  process.stderr.write(`check-overrides: ${stillNeeded.length} pin(s) still required (${stillNeeded.join(', ')}).\n`);
}

process.exit(0); // never block
