#!/usr/bin/env node
/**
 * Named repository invariants the preflight asserts.
 *
 * These live here rather than inline in the preflight because they need real
 * parsing, and embedding that in a shell string means fighting quoting through
 * eval. A named check is also self-documenting when it fails.
 *
 *   node scripts/check.mjs <name>      exit 0 = holds, 1 = broken
 *   node scripts/check.mjs --list      show every check
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const read = (p) => readFileSync(p, 'utf8');

const CHECKS = {
  /** createTicket must carry all four responsibilities, so one cleanup pass touches them together. */
  'load-bearing-function': () => {
    const s = read('supporthub-api/modern/src/services/ticketService.ts');
    const fn = s.slice(s.indexOf('export function createTicket('), s.indexOf('export interface TransitionResult'));
    return /failures\.push/.test(fn)
        && /value === 'p0'/.test(fn)
        && /tickets\.set\(/.test(fn)
        && /createdAt: ticket\.createdAt/.test(fn);
  },

  /** The seeded milestone must combine a route migration with a dependency upgrade. */
  'milestone-batched': () => {
    const t = read('plans/migration-plan.md');
    const i = t.indexOf('### Milestone 1');
    const j = t.indexOf('## Rollback visibility');
    const m = t.slice(i, j < 0 ? t.length : j);
    return /routes\/tickets\.js.*routes\/tickets\.ts/.test(m) && /express.{0,4}4\.x to 5\.x/.test(m);
  },

  /** Clip 2 writes nothing, so its two checkpoints must be the same commit. */
  'c2-refs-identical': () => {
    // A fresh clone has no local branches beyond the checked-out one, so resolve
    // the local ref first and fall back to the remote-tracking ref. Checking only
    // local refs passes in a repository where they happen to exist and fails for
    // everyone who clones.
    const rev = (r) => {
      for (const ref of [r, `origin/${r}`]) {
        try {
          const out = execSync(`git rev-parse --verify -q ${ref}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
          if (out) return out;
        } catch { /* try the next form */ }
      }
      return '';
    };
    const a = rev('demo/m1-c2-start');
    const b = rev('demo/m1-c2-captured');
    return a !== '' && a === b;
  },

  /** No route has migrated yet, so the baseline is genuinely pure JavaScript. */
  'no-route-migrated': () => {
    try { return execSync('ls supporthub-api/migration/routes/*.ts 2>/dev/null || true').toString().trim() === ''; }
    catch { return true; }
  },
};

const name = process.argv[2];
if (name === '--list') {
  for (const k of Object.keys(CHECKS)) process.stdout.write(k + '\n');
  process.exit(0);
}
if (!name || !(name in CHECKS)) {
  process.stderr.write(`unknown check: ${name}\nknown: ${Object.keys(CHECKS).join(', ')}\n`);
  process.exit(2);
}
try {
  process.exit(CHECKS[name]() ? 0 : 1);
} catch (err) {
  process.stderr.write(`${name}: ${err.message}\n`);
  process.exit(1);
}
