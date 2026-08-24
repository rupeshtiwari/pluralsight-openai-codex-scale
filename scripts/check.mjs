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
 *
 * File reads resolve against CHECK_ROOT when it is set, so a check can be run
 * against a mutated copy of the repository without touching the working tree.
 * That is how scripts/check-negatives.mjs proves each check fails on the
 * condition it exists to detect. See "Prove the negative case" in
 * docs/troubleshooting.md. Checks that shell out to git ignore CHECK_ROOT and
 * are marked below; they are proven a different way.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.env.CHECK_ROOT || '.';
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

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
    if (i < 0) return false;
    // Bound the slice at the next heading of ANY level, so what is tested is one
    // milestone entry rather than the whole milestone list. Stopping at the next
    // '## ' spans a '### Milestone 2', which means the two patterns below could
    // match in different entries and the check would still pass after exactly the
    // split it exists to detect. '\n##' matches both '## ' and '### '.
    const j = t.indexOf('\n##', i + 1);
    const m = t.slice(i, j < 0 ? t.length : j);
    return /routes\/tickets\.js.*routes\/tickets\.ts/.test(m) && /express.{0,4}4\.x to 5\.x/.test(m);
  },

  /**
   * The skill must not load unless a prompt asks for it. This is the precondition
   * the whole negative control rests on: an ambient directive in AGENTS.md would
   * load the skill in BOTH runs, make them identical, and quietly turn
   * m1-c6-framework-skill-evidence.md into a comparison of nothing. It has been
   * wrong once already -- AGENTS.md used to say "Consult it before migrating any
   * route" -- and the damage is invisible until both runs come back the same.
   */
  'skill-not-ambient': () => {
    const t = read('AGENTS.md');
    if (!/Do not consult it unless the prompt asks you to\./.test(t)) return false;
    // Affirmative directives that would contradict the opt-out. Every pattern is
    // anchored to a sentence start, because AGENTS.md explains the rule as well as
    // stating it: the opt-out's own "Do not consult it", and the sentence "An
    // instruction here to always consult it would make both runs identical", must
    // not trip a check whose whole subject they are. Prose about a prohibition is
    // not the prohibition.
    const DIRECTIVES = [
      /(?:^|[.!?]\s|\n)\s*Consult\b/i,
      /(?:^|[.!?]\s|\n)\s*Always consult\b/i,
      /\bbefore migrating any route\b/i,
      /(?:^|[.!?]\s|\n)\s*Read\s+framework-skill/i,
    ];
    return !DIRECTIVES.some((re) => re.test(t));
  },

  /**
   * Clip 2 writes nothing, so its two checkpoints must be the same commit.
   * Reads git, not files: ignores CHECK_ROOT. Proven by the clean-clone check,
   * where the local-refs-only version failed as it should have.
   */
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

  /**
   * No route has migrated yet, so the baseline is genuinely pure JavaScript.
   * Globs the real tree: ignores CHECK_ROOT. Proven by creating a throwaway
   * routes/*.ts and watching this go red.
   */
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
