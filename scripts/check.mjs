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
import { readFileSync, existsSync, globSync, readdirSync, unlinkSync } from 'node:fs';
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
   * Both ESLint configs must pin tsconfigRootDir to their own directory.
   *
   * The repository holds two sibling TypeScript workspaces. The CLI infers a
   * parser root from its working directory, so 'npm run lint' passes either way
   * -- but the VS Code ESLint extension scans from the repository root, finds two
   * candidate roots, and refuses to guess. The result is a parsing-error badge on
   * every open .ts tab while every command line says PASS.
   *
   * That badge is a recording defect, not a code defect. Clip 2's closing proof is
   * that nothing is wrong and nothing was touched; a red tab through the whole
   * demo argues the opposite, and a learner cloning the repository sees it too.
   *
   * The value must be a self-relative expression, never a literal path: a
   * hardcoded root works on the machine it was written on and breaks for everyone
   * else, which is the same defect wearing a different hat.
   */
  'eslint-tsconfigrootdir-set': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const WANT = {
      'supporthub-api/modern/eslint.config.js': 'import.meta.dirname',
      'supporthub-api/migration/eslint.config.js': '__dirname',
    };
    let ok = true;
    for (const [file, expr] of Object.entries(WANT)) {
      const src = read(file);
      const m = src.match(/tsconfigRootDir\s*:\s*([^,\n}]+)/);
      if (!m) {
        ok = reject(`${file} does not set parserOptions.tsconfigRootDir`) && ok;
        continue;
      }
      const value = m[1].trim();
      if (value !== expr) {
        ok = reject(`${file} sets tsconfigRootDir to ${value}, expected ${expr}`) && ok;
      }
    }
    return ok;
  },

  /**
   * The 25 contract tests must pass. Counted from JSON, not from the summary line.
   *
   * This asserted on vitest's formatted output -- a literal grep for
   * "Tests  25 passed (25)", including its two spaces. It matched on Linux with a
   * piped stdout and failed on macOS while the very same tests passed when run by
   * hand a moment earlier, because the rendered line is not the same bytes in
   * every environment: colour codes, terminal width and reporter defaults all
   * move it.
   *
   * Instance 8's rule, a second time: never assert on a tool's default output
   * format. The JSON reporter is a contract; the pretty summary is a rendering.
   */
  'contract-tests-pass': () => {
    // Absolute, because vitest resolves outputFile against its own cwd while the
    // read below resolves against the repo root. A relative path silently lands
    // in supporthub-api/modern/supporthub-api/modern/.
    const dir = resolve(ROOT, 'supporthub-api/modern');
    const out = resolve(dir, '.vitest-check.json');
    try {
      execSync(`npx vitest run --reporter=json --outputFile=${JSON.stringify(out)}`, {
        cwd: dir,
        stdio: ['ignore', 'ignore', 'ignore'],
      });
    } catch { /* a failing suite still writes the file; read it and report properly */ }
    let r;
    try { r = JSON.parse(readFileSync(out, 'utf8')); }
    catch { process.stderr.write('  vitest produced no JSON report — the run did not start\n'); return false; }
    finally { try { unlinkSync(out); } catch { /* nothing to clean up */ } }

    if (r.numFailedTests > 0) {
      process.stderr.write(`  ${r.numFailedTests} contract test(s) failing\n`);
      return false;
    }
    if (r.numPassedTests !== 25) {
      process.stderr.write(`  ${r.numPassedTests} contract tests passed, expected 25 — a test was added or removed\n`);
      return false;
    }
    return true;
  },

  /**
   * The clip 2 seed must match what the runbook tells the author to expect.
   *
   * Every number here was wrong until a live walk measured it. The preflight
   * asserted "two duplicate normalization sites" while counting FILES, its own
   * recovery prompt said three files, and the runbook said two sites. There are
   * three sites in two files. The runbook also listed three "unreferenced
   * exports" naming toPriority and validateNewTicket, which are not exported at
   * all -- they are dead private helpers, a different finding. Codex reported
   * five real unreferenced exports and was right.
   *
   * Counted here rather than grepped from shell so the three quantities the
   * author reads on camera cannot drift from the code again.
   */
  'c2-seed-shape': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const files = globSync('supporthub-api/modern/**/*.ts', { cwd: ROOT })
      .filter((f) => !f.includes('node_modules') && !f.includes('/dist/'));
    const src = Object.fromEntries(files.map((f) => [f, read(f)]));
    let ok = true;

    // 1. Three priority-normalization sites, not two, and not two files.
    const sites = files.reduce((n, f) => n + (src[f].match(/value === 'p0'/g) || []).length, 0);
    if (sites !== 3) ok = reject(`expected 3 priority-normalization sites, found ${sites}`) && ok;

    // 2. Exactly these five exports have no reference outside their own file.
    const defs = [];
    for (const f of files) for (const m of src[f].matchAll(/^export (?:function|const) (\w+)/gm)) defs.push([m[1], f]);
    const unref = defs
      .filter(([n, home]) => !files.some((f) => f !== home && new RegExp(`\\b${n}\\b`).test(src[f])))
      .map(([n]) => n).sort();
    const want = ['moduleDir', 'normalizeLegacySeverity', 'normalizePriority', 'requireFromEsm', 'ticketsForIncident'];
    if (unref.join(',') !== want.join(',')) {
      ok = reject(`unreferenced exports are [${unref.join(', ')}], expected [${want.join(', ')}]`) && ok;
    }

    // 3. Two dead PRIVATE helpers -- not exports, and never called.
    const svc = src['supporthub-api/modern/src/services/ticketService.ts'];
    for (const name of ['toPriority', 'validateNewTicket']) {
      if (new RegExp(`^export (?:function|const) ${name}\\b`, 'm').test(svc)) {
        ok = reject(`${name} is exported — the runbook lists it as a dead private helper`) && ok;
      }
      if (!new RegExp(`^function ${name}\\(`, 'm').test(svc)) {
        ok = reject(`${name} is missing from ticketService.ts`) && ok;
      } else if ((svc.match(new RegExp(`\\b${name}\\s*\\(`, 'g')) || []).length !== 1) {
        ok = reject(`${name} is called somewhere — it must stay dead for the finding to hold`) && ok;
      }
    }

    // 4. No suppression comment. ESLint reports both helpers as unused, which
    // puts a yellow badge on ticketService.ts for the whole clip, and the
    // tempting fix is an eslint-disable on the seed. Section 12 of
    // docs/course-architecture-plan.md rules against it: the helpers being
    // unused IS the finding Step 1 asks for, so annotating them as known-dead
    // writes the answer into the file on screen and hides the linter's
    // corroboration. The badge is narrated instead.
    if (/eslint-disable/.test(svc)) {
      ok = reject('ticketService.ts carries an eslint-disable — the seed must not annotate its own dead code') && ok;
    }
    return ok;
  },

  /**
   * No prompt in clip 5 may reference the framework skill.
   *
   * Clip 5's objectives are TO2, EO2a and EO2b. The framework skill is EO2d,
   * which belongs to clip 6, and pulling it forward does more than leak scope: the
   * skill's first rule is never to combine a route migration with a dependency
   * upgrade, so Codex obeys it while planning and Step 4 has no batched milestone
   * left to reject. A live walk produced ten milestones with the route conversion
   * at 2 and the Express upgrade at 9. The demo cannot ask Codex to read a rule
   * and then catch it breaking that rule.
   *
   * Two halves, because omission is not a constraint. The absence of a reference
   * does not stop Codex reaching the file by its own retrieval, so a prompt has to
   * forbid it out loud, and that prohibition has to survive editing.
   */
  'c5-prompts-skill-free': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const t = read('module1/m1-c5-inventory-legacy-express4.md');
    // Prompt blocks only. The AUTHOR PREP section explains this constraint in
    // prose and necessarily names the skill to do so.
    const prompts = [...t.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
    if (prompts.length === 0) return reject('m1-c5: no prompt blocks found — the runbook shape changed');

    // The prohibition itself names the skill, so strip it before scanning. A
    // sentence forbidding a thing is not a use of it -- the same trap that made a
    // naive skill-not-ambient flag AGENTS.md for explaining its own rule.
    const BAN = /Do not read or apply any framework skill[^\n]*(\n[^\n]*guidance[^\n]*)?/i;
    let ok = true;
    prompts.forEach((body, i) => {
      const m = body.replace(BAN, "").match(/framework[- ]skill|SKILL\.md|node-express-migration/i);
      if (m) ok = reject(`m1-c5 prompt ${i + 1} references the framework skill ("${m[0]}") — clip 5 must plan unaided`) && ok;
    });

    if (!prompts.some((b) => /Do not read or apply any framework skill/i.test(b))) {
      ok = reject('m1-c5: no prompt forbids the framework skill out loud — omission alone does not stop retrieval') && ok;
    }
    return ok;
  },

  /**
   * The three sections clip 3 fills in must be empty at the starting checkpoint.
   *
   * Step 1's whole job is writing them on camera. A leftover gate list or
   * progress row from a previous take leaves Codex nothing to do and the step
   * plays as a no-op, which is invisible until the recording is watched back.
   *
   * Validation checks is the one that was missing. It used to ship pre-filled
   * with a gate list, so Step 1 appeared to fill a section that was already
   * written -- and a measured run overwrote it with a different list, which is
   * how the count drifted from the runbook in the first place.
   */
  'execplan-starts-unwritten': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const t = read('plans/ExecPlan.md');
    const section = (name) => {
      const i = t.indexOf(`## ${name}`);
      if (i < 0) return null;
      const j = t.indexOf('\n## ', i + 1);
      return t.slice(i, j < 0 ? t.length : j);
    };
    let ok = true;

    const v = section('Validation checks');
    if (v === null) ok = reject('plans/ExecPlan.md has no "## Validation checks" section') && ok;
    else if (!/_Not yet recorded\._/.test(v)) {
      ok = reject('Validation checks is already written — Step 1 has nothing to record on camera') && ok;
    } else if (/npm run |npm test/.test(v)) {
      ok = reject('Validation checks still names commands — reset it to the unwritten placeholder') && ok;
    }

    const p = section('Progress log');
    if (p === null || !/\|\s*not started\s*\|/.test(p)) {
      ok = reject('Progress log is not at its empty starting row') && ok;
    }

    const d = section('Deferred work');
    if (d === null) ok = reject('plans/ExecPlan.md has no "## Deferred work" section') && ok;
    else {
      const rows = [...d.matchAll(/^\|(?!\s*(?:Item|-+)\s*\|)(.+)\|\s*$/gm)]
        .filter((m) => !/^[\s|—–-]*$/.test(m[1]));
      if (rows.length) ok = reject(`Deferred work already has ${rows.length} row(s) — Step 4 fills it`) && ok;
    }
    return ok;
  },

  /**
   * Nothing may state how many validation gates clip 3 runs.
   *
   * Step 1's prompt asks Codex for "the exact commands that will prove those
   * contracts hold", so the gate list is its judgment, not a constant. A
   * measured run recorded four -- lint, typecheck, build, test -- adding a build
   * gate unprompted, which is correct: npm run build exists and a full tsc
   * writes output, so it can fail where a type-check-only run passes.
   *
   * The runbook used to grade that answer against three, and the ExecPlan used
   * to open on "Run all three". Both are the clip 2 defect in a new place: a
   * number written down beside a thing the model decides. Steps 2 and 4 now run
   * whatever the plan names, and no document states a count.
   *
   * Scoped to clip 3's files. Clip 6 legitimately says four, because the
   * framework skill fixes its gate list.
   */
  'c3-gates-not-hardcoded': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    // Two forms. The noun-anchored one catches "three gates" and "all three
    // gates pass". The second catches "Run all four.", where the noun is
    // implicit -- the exact phrasing this check exists for, which slipped
    // through the noun-anchored pattern alone until a negative case caught it.
    //
    // Both are deliberately narrow. A first attempt matched any count after
    // "all", and flagged "preconditions for all four Module 1 demos" -- a fixed
    // number that has nothing to do with gates. Counts this repository really
    // does assert (four demos, four contract files, 25 tests, four intended
    // changes) must not trip a check about a number Codex chooses.
    const COUNT = /\bRun all (?:two|three|four|five|six|[2-6])\b|\b(?:two|three|four|five|six) (?:validation )?(?:gates|checks|commands)\b/i;
    const HARDCODED_RUN = /npm run lint\s*&&\s*npm run typecheck/;
    let ok = true;
    for (const f of [
      'module1/m1-c3-execute-codex-refactor.md',
      'plans/prompts/m1-c3-bounded-cleanup.md',
      'plans/ExecPlan.md',
    ]) {
      const t = read(f);
      const c = t.match(COUNT);
      if (c) ok = reject(`${f} states a gate count ("${c[0].trim()}") — Step 1 lets Codex choose the list`) && ok;
      const h = t.match(HARDCODED_RUN);
      if (h) ok = reject(`${f} hardcodes the gate command line — run what the ExecPlan names instead`) && ok;
    }
    return ok;
  },

  /**
   * Every workspace opened on camera must lint completely silent -- zero errors
   * AND zero warnings.
   *
   * Section 12 of docs/course-architecture-plan.md is the rule; this measures
   * it. An error badge says a tool could not do its job. A warning badge is an
   * error badge in a friendlier colour: unexplained on screen, it reads as a
   * defect in the thing being taught, and clip 2's whole closing argument is
   * that nothing is wrong and nothing was touched.
   *
   * Clip 2 carried two: @typescript-eslint/no-unused-vars on the seeded dead
   * helpers toPriority and validateNewTicket, yellow on ticketService.ts for the
   * full six minutes. Fixed in supporthub-api/modern/eslint.config.js by turning
   * the rule off to match "noUnusedLocals": false in the tsconfig beside it --
   * not with an eslint-disable in the source, which would have annotated the
   * finding Codex is meant to make. c2-seed-shape guards that half.
   *
   * Counted from --format json rather than from the printed summary. Instance 8's
   * rule: never assert on a tool's default output format. Needs the real
   * node_modules, so it ignores CHECK_ROOT and is proven by hand.
   */
  'workspace-lint-silent': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    let ok = true;
    for (const ws of ['supporthub-api/modern', 'supporthub-api/migration']) {
      const cwd = resolve(ROOT, ws);
      let out;
      try {
        out = execSync('npx eslint . --format json', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      } catch (err) {
        // eslint exits non-zero on errors and still writes the report to stdout.
        out = err.stdout || '';
      }
      let r;
      try { r = JSON.parse(out); }
      catch { ok = reject(`${ws}: eslint produced no JSON report — the run did not start`) && ok; continue; }
      for (const f of r) {
        for (const m of f.messages) {
          const where = f.filePath.replace(`${cwd}/`, '');
          ok = reject(`${ws}: ${m.severity === 2 ? 'error' : 'warning'} at ${where}:${m.line} — ${m.ruleId}: ${m.message}`) && ok;
        }
      }
    }
    return ok;
  },

  /**
   * No prompt may ban commands outright, and the read-only demos must grant
   * inspection out loud.
   *
   * Clip 2's Step 1 prompt said "do not edit any files and do not run any
   * commands". Codex read the second clause as covering reading too, and
   * refused the step: "Because you explicitly said do not run any commands and
   * do not edit files, I won't inspect the repo via shell." It is right to. The
   * ban was written to stop tests, builds and installs -- work that writes to the
   * tree or takes noticeable time on camera -- but ls, rg and cat are commands as
   * well, and a demo whose whole subject is analysing a real repository cannot
   * run with the repository closed.
   *
   * Two halves, for the reason c5-prompts-skill-free has two: omission is not
   * permission. Deleting the ban leaves the prompt silent about reading, and
   * silence beside "do not edit any files" is what Codex generalised from in the
   * first place. So the permission has to be stated, and the statement has to
   * survive editing.
   *
   * The first half scans every prompt block in the repository rather than only
   * clip 2's and clip 5's: the phrasing is easy to copy into a new runbook, and
   * prompts that legitimately run commands (clip 3, clip 6) never contain it.
   * Prose is not scanned -- this file and docs/troubleshooting.md both quote the
   * banned phrasing to explain it, the same trap skill-not-ambient hit.
   */
  'prompts-allow-read-only-inspection': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const BLANKET = /do not run any (?:shell )?commands|run no commands|without running any commands|no commands at all/i;
    const PERMISSION = /Read the repository freely with read-only commands/i;
    const prompts = (src) => [...src.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);

    const files = globSync('**/*.md', { cwd: ROOT })
      .filter((f) => !f.includes('node_modules') && !f.includes('/dist/') && !f.includes('/logs/'));
    let ok = true;
    for (const f of files) {
      prompts(readFileSync(join(ROOT, f), 'utf8')).forEach((body, i) => {
        const hit = body.match(BLANKET);
        if (hit) {
          ok = reject(`${f} prompt ${i + 1} bans commands outright ("${hit[0]}") — Codex then declines to inspect the repository at all`) && ok;
        }
      });
    }

    // The two read-only demos. Both analyse a repository they may not touch, so
    // both have to say what "may not touch" does and does not cover.
    for (const f of [
      'module1/m1-c2-map-noisy-typescript-modules.md',
      'module1/m1-c5-inventory-legacy-express4.md',
    ]) {
      const bodies = prompts(read(f));
      if (bodies.length === 0) {
        ok = reject(`${f}: no prompt blocks found — the runbook shape changed`) && ok;
        continue;
      }
      if (!bodies.some((b) => PERMISSION.test(b))) {
        ok = reject(`${f}: no prompt grants read-only inspection out loud — silence beside "do not edit any files" is what broke Step 1`) && ok;
      }
    }
    return ok;
  },

  /**
   * The saved clip 2 prompts must match the runbook's, byte for byte.
   *
   * Same drift c6-prompt-saved exists to catch, and it had already happened
   * here unnoticed: the runbook carried the command ban and
   * plans/prompts/m1-c2-map-codebase.md did not, so the two places an author can
   * paste from were giving Codex different instructions. The runbook points at
   * the saved file by name, which makes either one a plausible source on
   * recording day.
   */
  'c2-prompts-saved': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const prompts = (f) => [...read(f).matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
    const rb = prompts('module1/m1-c2-map-noisy-typescript-modules.md');
    const saved = prompts('plans/prompts/m1-c2-map-codebase.md');
    if (rb.length === 0) return reject('m1-c2: no prompt blocks found — the runbook shape changed');
    if (rb.length !== saved.length) {
      return reject(`m1-c2 has ${rb.length} prompts, plans/prompts/m1-c2-map-codebase.md has ${saved.length}`);
    }
    let ok = true;
    rb.forEach((body, i) => {
      if (body !== saved[i]) ok = reject(`m1-c2 prompt ${i + 1} differs from the saved copy`) && ok;
    });
    return ok;
  },

  /**
   * Every demo runbook must match the approved outline.
   *
   * docs/outline-clip-map.json is transcribed verbatim from the outline's Course
   * Organization section and is the contract: which objectives each clip carries,
   * the objective wording, and the four bullets in order. The runbooks are
   * derived from it, so when they disagree the runbook is wrong.
   *
   * Checked because the drift is silent and one-directional: a step heading
   * shortened for readability reads fine on its own while quietly dropping scope
   * the outline promised. Two did. One lost "and have Codex split it into two
   * checkpoints"; the other lost "equivalent Node.js and TypeScript", which is
   * the clause carrying EO2d's ASP.NET substitution.
   */
  'clip-outline-alignment': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const map = JSON.parse(read('docs/outline-clip-map.json'));
    let ok = true;
    for (const [clip, c] of Object.entries(map.clips)) {
      const t = read(c.runbook);
      const i = t.indexOf('## Learning Objectives');
      const j = t.indexOf('\n## ', i + 1);
      const sec = i < 0 ? '' : t.slice(i, j < 0 ? t.length : j);

      const ids = [...sec.matchAll(/^\|\s*(TO\d|EO\d[a-d])\s*\|/gm)].map((m) => m[1]);
      if (ids.join(',') !== c.objectives.join(',')) {
        ok = reject(`${clip}: objectives are ${ids.join(',') || 'none'}, outline says ${c.objectives.join(',')}`) && ok;
      }
      for (const m of sec.matchAll(/^\|\s*(TO\d|EO\d[a-d])\s*\|\s*(.+?)\s*\|\s*$/gm)) {
        const want = (map.objectives[m[1]] || '').replace(/\.$/, '').trim();
        const got = m[2].replace(/\.$/, '').trim();
        if (want !== got) ok = reject(`${clip}: ${m[1]} wording differs from the outline`) && ok;
      }

      const steps = [...t.matchAll(/^## Step (\d+) — (.+)$/gm)].map((m) => m[2].trim());
      if (steps.length !== c.bullets.length) {
        ok = reject(`${clip}: ${steps.length} steps, outline has ${c.bullets.length} bullets`) && ok;
        continue;
      }
      steps.forEach((s, k) => {
        if (s !== c.bullets[k].trim()) {
          ok = reject(`${clip} step ${k + 1} does not match its outline bullet\n      outline: ${c.bullets[k]}\n      runbook: ${s}`) && ok;
        }
      });
    }
    return ok;
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
    // Published refs are the subject. A stale local branch is a different problem
    // from a diverged repository, and conflating them cost three false FAILs on
    // the recording machine: every push left the sibling local branch behind, and
    // the check reported the repository as broken when only the checkout was.
    // origin/ is asked first for that reason; local is the fallback for a clone
    // with no remote.
    const rev = (ref) => {
      try {
        return execSync(`git rev-parse --verify -q ${ref}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      } catch { return ''; }
    };
    const resolve2 = (b) => rev(`origin/${b}`) || rev(b);
    const START = 'demo/m1-c2-start';
    const CAPTURED = 'demo/m1-c2-captured';

    const a = resolve2(START);
    const b = resolve2(CAPTURED);
    if (a === '') {
      process.stderr.write(`  ${START} does not resolve — fetch the demo branches\n`);
      return false;
    }
    if (a !== b) {
      process.stderr.write(`  ${START} and ${CAPTURED} are different commits in the repository\n`);
      process.stderr.write('  clip 2 writes nothing, so a difference means the demo edited files\n');
      return false;
    }

    // Published state is correct. Report a stale local checkout separately, and
    // do not fail on it: it is the reader's machine, not the repository.
    for (const b2 of [START, CAPTURED]) {
      const local = rev(b2);
      const remote = rev(`origin/${b2}`);
      if (local && remote && local !== remote) {
        process.stderr.write(`  note: local ${b2} is stale (${local.slice(0, 7)} vs origin ${remote.slice(0, 7)})\n`);
        process.stderr.write(`  note: git fetch origin && git branch -f ${b2} origin/${b2}\n`);
      }
    }
    return true;
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
