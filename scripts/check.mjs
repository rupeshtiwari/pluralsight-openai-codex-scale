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
import { readFileSync, existsSync, globSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.env.CHECK_ROOT || '.';
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * The post-rejection state of plans/migration-plan.md: exactly two checkpoint
 * entries, each independently validatable and revertible, neither batching code
 * with dependencies. Shared by the two branch guards, which assert the same
 * shape from different checkouts. Writes the reason to stderr, because "the plan
 * is wrong" is not actionable at the point someone hits it.
 */
function splitPlanHolds() {
  const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
  const t = read('plans/migration-plan.md');

  const start = t.indexOf('## Milestones');
  if (start < 0) return reject('plans/migration-plan.md has no "## Milestones" section');
  const end = t.indexOf('\n## ', start + 1);
  const section = t.slice(start, end < 0 ? t.length : end);

  const entries = section.split(/\n### /).slice(1);
  if (entries.length !== 2) {
    return reject(
      `expected exactly 2 checkpoint entries under "## Milestones", found ${entries.length}`
      + (entries.length === 1 ? ' -- this looks like the batched plan, not the split' : ''),
    );
  }

  for (const [i, e] of entries.entries()) {
    const n = i + 1;
    for (const field of ['| Scope |', '| Validation |', '| Rollback point |']) {
      if (!e.includes(field)) {
        return reject(`checkpoint ${n} is missing its ${field.replaceAll('|', '').trim()} row`);
      }
    }
    const migratesRoute = /routes\/tickets\.js.*routes\/tickets\.ts/.test(e);
    const upgradesDep = /express.{0,4}4\.x to 5\.x/i.test(e);
    if (migratesRoute && upgradesDep) {
      return reject(`checkpoint ${n} still combines the route migration with the Express upgrade`);
    }
  }
  return true;
}

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
   * The legacy service's 8 tests must pass before clip 5 plans its migration.
   *
   * The reporter is pinned rather than left to the default. Node's test runner
   * prints '# pass 8' under the tap reporter and 'i pass 8' under spec, and
   * Node 23 made spec the default -- so a grep for '# pass 8' passed on Node 22
   * and failed on the Node 24 this course targets, while the tests themselves
   * were green either way. Asserting on a default that changes between runtimes
   * is asserting on nothing.
   */
  'migration-tests-pass': () => {
    const out = execSync('node --test --test-reporter=tap tests/*.test.js', {
      cwd: join(ROOT, 'supporthub-api/migration'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return /^# pass 8$/m.test(out) && /^# fail 0$/m.test(out);
  },

  /**
   * Every relative markdown link must resolve, and no link may be malformed.
   *
   * Both halves are here because both have already happened. Every runbook link
   * in module1/README.md and module2/README.md was written '[label]path)' --
   * missing the opening paren -- so markdown rendered it as literal text and it
   * pointed nowhere. That form is invisible to a checker that only validates
   * well-formed links, because it is not a link at all. The other half guards
   * renames: these files moved from m1-demo1..4 to clip numbers, and a stale
   * target is exactly what a learner hits first.
   */
  'doc-links-resolve': () => {
    // Globbed rather than listed by git, so the check can run against a
    // relocated CHECK_ROOT that is not a git repository.
    const files = globSync('**/*.md', { cwd: ROOT })
      .filter((f) => !f.includes('node_modules') && !f.startsWith('.git/'));
    // Top-level directories of the repository, read from the tree itself so a
    // new one does not silently fall outside the check.
    const TOP = new Set(
      readdirSync(ROOT, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
        .map((e) => e.name),
    );
    let bad = 0;
    for (const f of files) {
      const abs = join(ROOT, f);
      const text = readFileSync(abs, 'utf8');
      // Well-formed links to repo-relative paths must resolve.
      for (const m of text.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
        const target = m[1];
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const path = target.split('#')[0];
        if (!path) continue;
        if (!existsSync(resolve(dirname(abs), path))) {
          process.stderr.write(`  broken link  ${f} -> ${target}\n`);
          bad += 1;
        }
      }
      // '[label]something)' is a link with the opening paren dropped. It renders
      // as plain text, so it is never reported as broken by anything else.
      for (const m of text.matchAll(/\[[^\]\n]*\][^(\s][^\n)]*\)/g)) {
        process.stderr.write(`  malformed link  ${f}: ${m[0].slice(0, 60)}\n`);
        bad += 1;
      }
      // Repository paths written in backticks rather than as links. Only those
      // rooted at a real top-level directory are checked: the runbooks also use
      // short forms like `utils/priority.ts` for a file inside a workspace, and
      // those are prose, not references. Two renamed prompt files sat wrong here
      // for weeks because a backtick path is invisible to a link checker.
      for (const m of text.matchAll(/`([A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)+\.(?:ts|js|mjs|json|md|sh|txt|yml))`/g)) {
        const rel = m[1];
        if (!TOP.has(rel.split('/')[0])) continue;
        if (!existsSync(join(ROOT, rel))) {
          process.stderr.write(`  broken path  ${f} -> ${rel}\n`);
          bad += 1;
        }
      }
    }
    return bad === 0;
  },

  /**
   * demo/m1-c5-captured must open on the two-checkpoint split.
   *
   * Same assertion as c6-start-opens-on-split, run from a different checkout.
   * Both branches carry the post-rejection plan, so both must show it.
   */
  'c5-captured-opens-on-split': () => splitPlanHolds(),

  /**
   * demo/m1-c6-start must open on the two-checkpoint split.
   *
   * This is the guard for the one mis-cut in the chain that fails silently.
   * m1-c6-start has to be branched from m1-c5-captured. Cut from the build
   * branch instead it opens on the COMBINED milestone -- the inverse of its own
   * definition -- and 'milestone-batched' would confirm it, because that check
   * asserts exactly the state a mis-cut C6 would have. Every other invariant
   * passes too. Nothing catches it until C6 records against the wrong plan.
   *
   * So this asserts the opposite shape: exactly two checkpoint entries, each
   * carrying scope, validation and a rollback point, and neither combining a
   * route migration with a dependency upgrade.
   */
  'c6-start-opens-on-split': () => splitPlanHolds(),

  /**
   * No runnable block may check out a demo branch that does not exist.
   *
   * The C6 evidence artifact opened with 'git checkout demo/m1-c6-start' inside a
   * bash fence, and that branch cannot exist until C5 has been walked. Following
   * the document as written failed on its first line. A blocked checkpoint has to
   * be described, not handed over as a command -- so this only inspects bash
   * fences, and indented prose showing what to run *later* is deliberately fine.
   *
   * Reads git, so it ignores CHECK_ROOT.
   */
  'demo-checkout-refs-exist': () => {
    const exists = (ref) => {
      for (const r of [ref, `origin/${ref}`]) {
        try {
          if (execSync(`git rev-parse --verify -q ${r}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) return true;
        } catch { /* try the next form */ }
      }
      return false;
    };
    const files = execSync('git ls-files "*.md"', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    let bad = 0;
    for (const f of files) {
      for (const fence of readFileSync(f, 'utf8').matchAll(/```bash\n([\s\S]*?)\n```/g)) {
        for (const m of fence[1].matchAll(/git checkout\s+(demo\/[A-Za-z0-9._\/-]+)/g)) {
          if (!exists(m[1])) {
            process.stderr.write(`  ${f}: runnable block checks out ${m[1]}, which does not exist\n`);
            bad += 1;
          }
        }
      }
    }
    return bad === 0;
  },

  /**
   * The skill-off tells must stay unique to the skill.
   *
   * The toggle pre-check judges whether Codex read SKILL.md by looking for
   * phrasings that exist nowhere else, because a model's own account of its
   * retrieval is not reliable. If one of those phrasings is copied into another
   * document, it stops being evidence and nothing says so -- the pre-check would
   * keep reporting a load that never happened. Only SKILL.md and the evidence
   * artifact that quotes them as tells may contain them.
   */
  'skill-tells-unique': () => {
    const TELLS = [
      'emit failures that',
      'a later gate cannot substitute for an earlier one',
      'Never combine a route migration with a dependency upgrade',
    ];
    const ALLOWED = new Set([
      'framework-skill/node-express-migration/SKILL.md',
      'module1/m1-c6-framework-skill-evidence.md',
    ]);
    const files = globSync('**/*.md', { cwd: ROOT })
      .filter((f) => !f.includes('node_modules') && !f.includes('/dist/') && !f.includes('/logs/'));
    let ok = true;
    for (const tell of TELLS) {
      const hits = files.filter((f) => readFileSync(join(ROOT, f), 'utf8').includes(tell));
      if (!hits.includes('framework-skill/node-express-migration/SKILL.md')) {
        process.stderr.write(`  tell missing from the skill: "${tell}"\n`);
        ok = false;
      }
      for (const h of hits.filter((f) => !ALLOWED.has(f))) {
        process.stderr.write(`  tell leaked into ${h}: "${tell}"\n`);
        ok = false;
      }
    }
    return ok;
  },

  /**
   * The saved Run A prompt must match the runbook's, byte for byte, and open on
   * the skill line.
   *
   * The negative control is only valid if Run A and Run B differ by exactly one
   * line. Keeping the prompt in two places invites a second difference: edit the
   * runbook, forget the file, and the comparison silently stops measuring the
   * skill. Line 1 is asserted separately because Run B is defined as this file
   * without it.
   */
  'c6-prompt-saved': () => {
    const block = (file) => {
      const s = read(file);
      const i = s.indexOf('Read framework-skill/node-express-migration/SKILL.md');
      if (i < 0) return null;
      const j = s.indexOf('\n```', i);
      return j < 0 ? null : s.slice(i, j);
    };
    const a = block('module1/m1-c6-migrate-one-express-route.md');
    const b = block('plans/prompts/m1-c6-migrate-route.md');
    if (a === null || b === null || a !== b) return false;
    return b.split('\n')[0] === 'Read framework-skill/node-express-migration/SKILL.md and follow its guidance.';
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
