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
import { readFileSync, writeFileSync, existsSync, globSync, readdirSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
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

  // Each row is matched by what it has to state, not by the seed's label for it.
  // The seeded plan writes "Scope"; a measured C5 walk split that into "Kind" and
  // "Files touched", which says strictly more. Asserting the seed's vocabulary
  // rejected a correct artifact and would have pushed the author toward editing
  // Codex's output to fit the check -- the manufactured split the walkthrough
  // forbids.
  const ROWS = [
    ['what it touches', /\|\s*(?:Scope|Files touched|Files)\s*\|/i],
    ['Validation', /\|\s*Validation\s*\|/i],
    ['Rollback point', /\|\s*Rollback point\s*\|/i],
  ];
  for (const [i, e] of entries.entries()) {
    const n = i + 1;
    for (const [label, row] of ROWS) {
      if (!row.test(e)) return reject(`checkpoint ${n} is missing its ${label} row`);
    }
    const migratesRoute = /routes\/tickets\.js.*routes\/tickets\.mts/.test(e);
    // Not the seed's literal "`express` 4.x to 5.x". A walk wrote "Upgrade Express
    // 4 to Express 5", which that phrasing missed outright -- the batching test
    // would have stayed silent on a checkpoint that really did carry both. Bounded
    // to one line and one table cell so digits from a status code or a field list
    // cannot bridge into a false match.
    const upgradesDep = /\bexpress\b[^\n|]{0,40}\b4\b[^\n|]{0,24}\b(?:to|->|\u2192)\b[^\n|]{0,24}\b5\b/i.test(e);
    if (migratesRoute && upgradesDep) {
      return reject(`checkpoint ${n} still combines the route migration with the Express upgrade`);
    }
  }
  return true;
}

/**
 * The ```text blocks a clip sends on camera.
 *
 * plans/prompts/ is the record of what is typed in front of the viewer, so the
 * parity checks must compare against that and nothing else. Prep blocks send
 * prompts too -- the identity probe that catches Codex being open on a
 * different folder is one -- and counting those made both parity checks fail
 * the moment it was added, reporting a drift that did not exist.
 *
 * Missing marker is a hard failure rather than a silent whole-file scan: the
 * defect being avoided is exactly a parity check quietly widening its subject.
 */
const onCameraPrompts = (f) => {
  const s = read(f);
  const i = s.search(/^#+ *ON-CAMERA/m);
  if (i < 0) throw new Error(`${f}: no ON-CAMERA marker, so its on-camera prompts cannot be identified`);
  return [...s.slice(i).matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
};

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
    return /routes\/tickets\.js.*routes\/tickets\.mts/.test(m) && /express.{0,4}4\.x to 5\.x/.test(m);
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
      // Fenced code is not prose. A bash or JS block full of array literals and
      // character classes is not a set of markdown links, and scanning it
      // produced five "malformed link" reports for one regex -- `[^/]+\/)` and
      // friends -- the first time a snippet in docs/troubleshooting.md used
      // brackets. Blank the fences rather than dropping them, so line numbers
      // and any prose after a fence stay where they were.
      const text = readFileSync(abs, 'utf8').replace(
        /^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm,
        (block) => block.replace(/[^\n]/g, ' '),
      );
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
   * The two services must seed the same tickets and the same next id.
   *
   * They did not. Modern seeded ticket-1001 through ticket-1003 and legacy
   * seeded only 1001 and 1002 -- while both set nextId to 1004, so the legacy
   * service skipped an id that had never existed. A clip 5 inventory reported it
   * plainly: "seeded tickets ticket-1001 and ticket-1002, with next created id
   * starting at ticket-1004", and there was no answer to why.
   *
   * It matters because clip 6 migrates a route slice from one service into the
   * other, and clip 5 lists seeded data among the caller-visible contracts. Two
   * fixtures that disagree make "the external contract is unchanged" untestable
   * at exactly the boundary the module crosses.
   */
  'seed-parity-across-services': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const ids = (src) => [...src.matchAll(/id: '(ticket-\d+)'/g)].map((m) => m[1]);
    const next = (src) => (src.match(/nextId = (\d+)/) || [])[1];

    const legacy = read('supporthub-api/migration/services/ticketService.js');
    const modern = read('supporthub-api/modern/src/services/ticketService.ts');
    const l = ids(legacy);
    const m = ids(modern);
    let ok = true;

    if (l.join(',') !== m.join(',')) {
      ok = reject(`seeded ids differ — legacy [${l.join(', ')}], modern [${m.join(', ')}]`) && ok;
    }
    if (next(legacy) !== next(modern)) {
      ok = reject(`nextId differs — legacy ${next(legacy)}, modern ${next(modern)}`) && ok;
    }
    // The generated id must continue the seeds rather than skip a number.
    const highest = Math.max(...l.map((x) => Number(x.split('-')[1])), 0);
    if (Number(next(legacy)) !== highest + 1) {
      ok = reject(`nextId is ${next(legacy)} but the highest seeded id is ${highest} — the first created ticket would skip an id that never existed`) && ok;
    }
    return ok;
  },

  /**
   * The legacy service's route surface must match what clip 5 step 1 expects.
   *
   * The expected result named three routes behind API-key auth and omitted
   * GET /health -- which is the one route with no auth, and therefore the
   * evidence for the step's own Highlight that auth is applied per route rather
   * than globally. A walk inventoried four and the runbook said three.
   *
   * Counted from app.js and routes/tickets.js rather than trusted, because this
   * is the same defect clip 2 shipped: a number an author reads aloud that
   * nothing measured.
   */
  'c5-route-surface': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const app = read('supporthub-api/migration/app.js');
    const routes = read('supporthub-api/migration/routes/tickets.js');
    let ok = true;

    if (!/app\.get\('\/health'/.test(app)) {
      ok = reject('app.js no longer serves GET /health — step 1 expects it as the unauthenticated route') && ok;
    }
    if (/app\.use\(requireApiKey\)|app\.use\([^)]*apiKey/i.test(app)) {
      ok = reject('app.js applies auth globally — step 1 highlights that auth is per route') && ok;
    }

    const guarded = [...routes.matchAll(/router\.(get|post|patch|put|delete)\('([^']+)',\s*requireApiKey/g)]
      .map((m) => `${m[1].toUpperCase()} ${m[2]}`);
    const want = ['GET /tickets/:id', 'POST /tickets', 'PATCH /tickets/:id/status'];
    if (guarded.join(',') !== want.join(',')) {
      ok = reject(`authenticated routes are [${guarded.join(', ')}], expected [${want.join(', ')}]`) && ok;
    }

    const all = [...routes.matchAll(/router\.(get|post|patch|put|delete)\(/g)].length + 1; // + /health
    if (all !== 4) ok = reject(`the legacy service exposes ${all} routes, and step 1 expects four`) && ok;
    return ok;
  },

  /**
   * Clip 5 step 4 must audit the plan of record, not the conversation.
   *
   * The batched milestone is seeded in plans/migration-plan.md, where
   * milestone-batched, migration-plan-single-milestone and the unreviewed marker
   * all assert it, and where step 4's own second prompt writes the split back.
   * The audit prompt opened "For each milestone" with no referent, so Codex
   * evaluated the milestone list it had produced in conversation moments
   * earlier. That list is well-decomposed, because a competent agent plans a
   * migration incrementally, so the honest answer was "none" -- twice, in two
   * measured walks, once with ten milestones and once with seven.
   *
   * Two fixes were tried before this one and both moved the cause rather than
   * removing it: dropping the skill reference from step 2, then dropping the
   * atomicity rule from step 3. Both were real defects. Neither was this one.
   * The batch never had to be produced at all -- it ships in the repository, and
   * the prompt simply never pointed at it.
   */
  'c5-step4-audits-the-plan-file': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const t = read('module1/m1-c5-inventory-legacy-express4.md');
    const prompts = [...t.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
    // Matched on the phrase that identifies the audit, with whitespace collapsed
    // first -- the prompt is hard-wrapped, so a pattern written against the
    // sentence as read does not match the sentence as stored.
    const flat = (b) => b.replace(/\s+/g, ' ');
    const audit = prompts.find((b) => /changes application code, upgrades a dependency, or both/i.test(flat(b)));
    if (!audit) return reject('m1-c5: no milestone-audit prompt found — the runbook shape changed');
    if (!/plans\/migration-plan\.md/.test(audit)) {
      return reject('m1-c5 step 4 audits "each milestone" without naming plans/migration-plan.md — Codex will audit its own conversational list, which is decomposed, and find nothing');
    }
    return true;
  },

  /**
   * Clip 5's milestone prompt may not impose the rule clip 5 step 4 audits.
   *
   * Step 4 asks Codex which milestones both change application code and upgrade
   * a dependency, then has it split the one that does. Step 3's prompt opened
   * with "change one thing, not several" -- that same rule, stated as an
   * instruction -- and its Highlight added "a milestone with two is doing two
   * jobs". A walk produced thirteen single-concern milestones and step 4 found
   * nothing: "None of the milestones are both application-code changes and
   * dependency upgrades. The dependency upgrade is isolated in milestone 10."
   *
   * The batch is not something the agent has to invent here. Step 2's plan
   * already carries it -- a measured walk had "Migrate Routes to TS/ESM on
   * Express 5" -- so step 3 only has to avoid dissolving what it was handed.
   * That is the difference from clip 3, where the drift genuinely had to be
   * requested because nothing in the artifact supplied it.
   *
   * Third instance of one defect: a constraint in an earlier prompt removing the
   * decision a later step exists to teach. Clip 5 step 2 referenced the skill
   * whose first rule forbids the batch; clip 3 step 2 forbade the architectural
   * drift; clip 5 step 3 imposed decomposition. Each time the demo instructed
   * against the thing it was about to teach the operator to catch.
   *
   * Two halves. The prompt must not carry the atomicity rule, and it must still
   * ask for independent validation -- that half is EO2b and the outline bullet,
   * and unlike the atomicity rule it does not tell Codex what may be combined.
   */
  'c5-step3-does-not-decompose': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const t = read('module1/m1-c5-inventory-legacy-express4.md');
    const prompts = [...t.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
    const milestone = prompts.find((b) => /Break the migration into incremental milestones/i.test(b));
    if (!milestone) return reject('m1-c5: no milestone prompt found — the runbook shape changed');

    const BANS = [
      /change one thing,? not several/i,
      /\bone (?:concern|change|thing) per milestone\b/i,
      /\bmust not combine\b/i,
      /\bsingle[- ]concern\b/i,
      /\bdo not (?:combine|bundle|batch)\b/i,
    ];
    let ok = true;
    for (const re of BANS) {
      const m = milestone.match(re);
      if (m) ok = reject(`m1-c5 milestone prompt imposes decomposition ("${m[0].trim()}") — step 4 then audits a list that already complies`) && ok;
    }
    if (!/be validated on its own by a named command/i.test(milestone)) {
      ok = reject('m1-c5 milestone prompt no longer asks for independent validation — that half is EO2b and must stay') && ok;
    }
    return ok;
  },

  /**
   * Clip 3's implementation prompt may not forbid the drift clip 3 exists to catch.
   *
   * Step 2's prompt carried three suppressors: "Implement ONLY the approved
   * cleanup theme", "Do not introduce a repository layer, a new directory, or
   * any new abstraction", and "Do not reorganize the service architecture".
   * Step 4's title is "Remove the architecture migration Codex bundled into the
   * cleanup diff". The prompt forbade in Step 2 exactly what Step 4 depends on
   * finding, and a measured run did what it was told: three files, all inside
   * the theme, with Codex reporting "No route files were changed."
   *
   * This is the clip 5 failure in a second place. There, a skill reference made
   * Codex plan by the rule Step 4 needed it to break. Here, a prohibition made
   * Codex behave the way Step 4 needed it to misbehave. A demo cannot instruct
   * against the thing it is about to teach you to catch.
   *
   * Two halves. The first bans structural prohibitions, which suppress the
   * drift. The second requires the behavioral contract to survive, because that
   * one must stay: it is EO1c's preservation half, and unlike the structural
   * bans it does not stop an agent from over-reaching -- a new repository module
   * changes no route path, status code or field name, which is precisely why
   * tests alone cannot catch it.
   */
  'c3-prompt-does-not-preempt-removal': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const BANS = [
      /do not (?:introduce|add|create)\b[^\n]*\b(?:repository|abstraction|layer|directory|module)/i,
      /do not (?:reorganize|restructure)\b/i,
      /\bimplement only\b/i,
      /do not (?:change|touch|alter) the (?:service )?architecture/i,
    ];
    const KEEP = /Do not change any route path, HTTP status code, or response field name/;

    let ok = true;
    for (const f of [
      'module1/m1-c3-execute-codex-refactor.md',
      'plans/prompts/m1-c3-bounded-cleanup.md',
    ]) {
      const t = read(f);
      // The implementation prompt only. Step 3's fallback deliberately asks for
      // an extraction, and the prose around both explains the rule -- neither is
      // an instruction to Codex, and neither may trip this.
      const prompts = [...t.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
      const impl = prompts.find((b) => /Implement\b[^\n]*approved cleanup theme/i.test(b));
      if (!impl) {
        ok = reject(`${f}: no implementation prompt found — the runbook shape changed`) && ok;
        continue;
      }
      for (const re of BANS) {
        const m = impl.match(re);
        if (m) {
          ok = reject(`${f}: the implementation prompt forbids structural work ("${m[0].trim()}") — Step 4 has nothing left to remove`) && ok;
        }
      }
      if (!KEEP.test(impl)) {
        ok = reject(`${f}: the implementation prompt lost the behavioral contract — Step 3 needs a diff that preserves behavior while exceeding scope`) && ok;
      }
    }
    return ok;
  },

  /**
   * Every preflight check must be mapped to the steps it gates.
   *
   * The per-clip transcripts group results by the clip's four steps, so an
   * author can read one file and see which step is blocked without a
   * screenshot. That grouping is only as good as docs/preflight-step-map.json,
   * and a map keyed by human-readable check names drifts the moment a check is
   * added, renamed or removed -- silently, because an unmapped check would just
   * quietly stop appearing under any step.
   *
   * So both directions are asserted: every scoped check in both preflight
   * scripts has an entry, and every entry names a check that still exists.
   * Checks tagged [all] gate every step of every clip and are deliberately
   * absent from the map.
   */
  'preflight-step-map-complete': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const map = JSON.parse(read('docs/preflight-step-map.json'));
    const outline = JSON.parse(read('docs/outline-clip-map.json'));
    let ok = true;

    for (const [mod, prefix] of [['1', 'm1'], ['2', 'm2']]) {
      const src = read(`module${mod}/scripts/preflight_check.sh`);
      const found = {};
      for (const m of src.matchAll(/check "([a-z0-9]+)" "([^"]+)"/g)) {
        if (m[1] === 'all') continue;
        (found[`${prefix}-${m[1]}`] ||= []).push(m[2]);
      }
      for (const [clip, names] of Object.entries(found)) {
        const entry = map[clip];
        if (!entry) { ok = reject(`docs/preflight-step-map.json has no entry for ${clip}`) && ok; continue; }
        const steps = (outline.clips[clip] || {}).bullets || [];
        for (const n of names) {
          if (!(n in entry)) {
            ok = reject(`${clip}: check "${n}" is not mapped to any step — it would vanish from the per-clip transcript`) && ok;
            continue;
          }
          for (const st of entry[n]) {
            if (!Number.isInteger(st) || st < 1 || st > steps.length) {
              ok = reject(`${clip}: check "${n}" maps to step ${st}, but the outline gives this clip ${steps.length} steps`) && ok;
            }
          }
        }
        for (const n of Object.keys(entry)) {
          if (!names.includes(n)) {
            ok = reject(`${clip}: the map names "${n}", which is not a check in the preflight any more`) && ok;
          }
        }
      }
    }

    for (const clip of Object.keys(map)) {
      if (clip.startsWith('_')) continue;
      if (!outline.clips[clip]) ok = reject(`the map names ${clip}, which the outline does not`) && ok;
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
   * The markdown files opened on camera must lint completely silent.
   *
   * Same shape as workspace-lint-silent, different tool. plans/ExecPlan.md is on
   * screen for all four clip 3 steps and Codex rewrites its tables in step 1;
   * plans/migration-plan.md is clip 5's artifact. A measured run put 518
   * markdownlint problems on ExecPlan.md -- 494 errors, almost all
   * MD060/table-column-style -- while the command line said nothing, because
   * nothing on the command line was running markdownlint at all.
   *
   * Section 12 used to say a badge like this "is not covered by the preflight,
   * and cannot be", on the grounds that the badge comes from an editor extension.
   * That was true of the ESLint parser-root case and is false here: the
   * extension and the CLI read the same .markdownlint.json, so the badge is
   * measurable and is now measured.
   *
   * .markdownlint.json disables the rules where markdownlint's defaults disagree
   * with a convention this repository uses on purpose -- MD060 for tables Codex
   * writes, MD046 for the indented illustration blocks section 10 requires,
   * MD025 for the '# ON-CAMERA' divider. It does not silence real defects: six
   * MD022 findings in migration-plan.md were headings genuinely missing a blank
   * line, and those were fixed rather than configured away.
   *
   * Needs the real node_modules, so it ignores CHECK_ROOT and is proven by hand.
   */
  'oncamera-markdown-lint-silent': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const FILES = ['plans/ExecPlan.md', 'plans/migration-plan.md'];
    let ok = true;

    // 1. The config must be valid against the schema the tools validate against.
    //    An invalid config does not error -- an editor falls back to defaults and
    //    lights the file up while the CLI shrugs and reports nothing. That is
    //    exactly what happened: five "//" comment keys held string values, and
    //    the schema allows unknown keys only when their value is boolean or
    //    object. CLI silent, editor 590 errors, on the same bytes.
    const SCHEMA = 'node_modules/markdownlint-cli2/schema/markdownlint-config-schema.json';
    let schema = null;
    try { schema = JSON.parse(readFileSync(resolve(ROOT, SCHEMA), 'utf8')); } catch { /* optional */ }
    let cfg;
    try { cfg = JSON.parse(read('.markdownlint.json')); }
    catch (e) { return reject(`.markdownlint.json does not parse: ${e.message}`); }
    if (schema) {
      for (const [k, v] of Object.entries(cfg)) {
        if (schema.properties && k in schema.properties) continue;
        const t = typeof v;
        if (t !== 'boolean' && t !== 'object') {
          ok = reject(`.markdownlint.json: "${k}" holds a ${t}; the schema allows unknown keys only as boolean or object, so an editor that validates this config discards all of it`) && ok;
        }
      }
    }

    // 2. The two on-camera plans are rewritten by Codex at record time and
    //    their shape is not ours. Measured problem counts on the same step of
    //    the same demo: 518, then 590. No configuration fitted to one run's
    //    output survives the next, so these files suppress linting inline. An
    //    inline directive is honoured by every markdownlint version and by the
    //    editor extension whatever config file it found, or none -- which a
    //    config by itself cannot promise.
    //
    //    Asserted by EFFECT, never by presence. The first directive written here
    //    was `<!-- markdownlint-disable -- Codex rewrites this file... -->`, and
    //    it suppressed nothing: text after the command is parsed as rule names,
    //    so the bare form is the only one that works. A check that grepped for
    //    the directive would have passed on that file forever while the editor
    //    stayed red. So each file's real opening bytes are copied into a probe,
    //    known-bad markdown is appended, and the probe must lint silent.
    const HEAD_LINES = 7;
    for (const f of FILES) {
      const head = read(f).split('\n').slice(0, HEAD_LINES).join('\n');
      const dir2 = resolve(ROOT, '.md-directive-probe');
      let hits = [];
      try {
        mkdirSync(dir2, { recursive: true });
        writeFileSync(join(dir2, '.markdownlint.json'), JSON.stringify(cfg));
        // Known-bad markdown, plus words no dictionary contains. Both tools are
        // run over the same probe, because both put an error badge on the same
        // tab and neither is visible to the other.
        writeFileSync(join(dir2, 'probe.md'), `${head}\n\n# H\n\n|a|b|\n|--|--|\n|1|2|\n\tTAB\n\n\n\n`);
        let out = '';
        try {
          execSync('npx markdownlint-cli2 probe.md', { cwd: dir2, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        } catch (err) { out = `${err.stdout || ''}${err.stderr || ''}`; }
        hits = out.split('\n').filter((l) => /probe\.md:\d+/.test(l));

      } finally {
        try { rmSync(dir2, { recursive: true, force: true }); } catch { /* nothing to clean up */ }
      }
      if (hits.length) {
        ok = reject(`${f} does not actually suppress markdownlint - markdown that should raise ${hits.length} finding(s) still raises them under this file's opening lines`) && ok;
        process.stderr.write(`    first: ${(hits[0] || '').trim()}\n`);
        process.stderr.write('    the directive must be a bare <!-- markdownlint-disable -->; any text after the command is read as rule names\n');
      }

    }

    // 3. Spelling, on the documents cspell actually covers. plans/ is in
    //    ignorePaths because Codex writes those files and their vocabulary is
    //    its own, so there is nothing there to police.
    //
    //    This does NOT cover the badge that prompted the work. That was Spell
    //    Right, which ships no CLI and reads no config this repository can
    //    write, so no check here can see it. Said plainly rather than implied:
    //    a green result from this check means the tools with CLIs are quiet, not
    //    that the editor is.
    {
      let sout = '';
      try {
        sout = execSync('npx cspell --no-progress --no-summary "module1/*.md" "module2/*.md" "docs/*.md" README.md',
          { cwd: resolve(ROOT), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (err) { sout = `${err.stdout || ''}${err.stderr || ''}`; }
      const words = sout.split('\n').filter((l) => /\.md:\d+:\d+/.test(l));
      if (words.length) {
        ok = reject(`${words.length} unknown word(s) in the runbooks or docs — add real vocabulary to cspell.json, fix genuine typos`) && ok;
        for (const w of words.slice(0, 3)) process.stderr.write(`    ${w.trim()}\n`);
      }
    }

    // 4. The config still has to be sound for agent-written markdown, or every
    //    other document drifts. Lint a synthetic file in the shape Codex writes
    //    -- padded wide tables, long rows -- under the real config, with no
    //    inline directive, and require silence.
    const dir = resolve(ROOT, '.md-shape-probe');
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, '.markdownlint.json'), JSON.stringify(cfg));
      writeFileSync(join(dir, 'probe.md'), [
        '# Probe', '',
        '## Behavior contracts', '',
        '| Route          | Method | Status codes | Response fields                                    | Locked by                                            |',
        '| -------------- | ------ | ------------ | -------------------------------------------------- | ---------------------------------------------------- |',
        '| /tickets/:id   | GET    | 200, 404     | id, subject, status, priority, assignee, accountId  | tests/contracts/ticket-read-route.contract.test.ts   |',
        '',
        '## Validation checks', '',
        '| # | Command                                        | Proves |',
        '|---|------------------------------------------------|--------|',
        '| 1 | npm --prefix supporthub-api/modern run lint    | style  |',
        '',
      ].join('\n'));
      let out = '';
      try {
        execSync('npx markdownlint-cli2 probe.md', { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (err) { out = `${err.stdout || ''}${err.stderr || ''}`; }
      const hits = out.split('\n').filter((l) => /probe\.md:\d+/.test(l));
      if (hits.length) {
        ok = reject(`the config rejects ${hits.length} thing(s) in agent-shaped markdown - it was fitted to one run's output, not to the shape`) && ok;
        for (const h of hits.slice(0, 4)) process.stderr.write(`    ${h.trim()}\n`);
      }
    } finally {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* nothing to clean up */ }
    }
    return ok;
  },

  /**
   * Every tracked document must lint clean, not only the two on camera.
   *
   * lint:md covered plans/ExecPlan.md and plans/migration-plan.md and nothing
   * else, so 46 real defects sat in the runbooks and docs unnoticed: headings
   * with no blank line under them, lists with none above, doubled blanks, and
   * two rows of the negative-case roster orphaned out of their table by a blank
   * line, which is why they rendered as loose text and why MD013's tables
   * exemption could not reach them.
   *
   * They surfaced when a copy of a runbook was opened from outside the
   * repository, where .markdownlint.json does not apply -- a config is scoped to
   * a location, and a copy of a file placed outside that location inherits none
   * of it. The badge was real; the repository had simply never looked.
   */
  'all-docs-lint-clean': () => {
    let out = '';
    try {
      execSync('npx markdownlint-cli2 "module1/*.md" "module2/*.md" "docs/*.md" "plans/*.md" README.md',
        { cwd: resolve(ROOT), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      return true;
    } catch (err) { out = `${err.stdout || ''}${err.stderr || ''}`; }
    const hits = out.split('\n').filter((l) => /\.md:\d+/.test(l));
    process.stderr.write(`  ${hits.length} markdownlint problem(s) across the tracked documents\n`);
    for (const h of hits.slice(0, 4)) process.stderr.write(`    ${h.trim()}\n`);
    return false;
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
    const rb = onCameraPrompts('module1/m1-c2-map-noisy-typescript-modules.md');
    // The saved file is prompts only, so it has no on-camera boundary to slice at.
    const saved = [...read('plans/prompts/m1-c2-map-codebase.md').matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
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
      // Presentation clips are in the map so it covers the whole outline and
      // outline-map-matches-source can check all of it. They have no runbook and
      // nothing here applies to them.
      if (!c.runbook) continue;
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
   * Every clip's starting checkpoint must exist.
   *
   * m1-c6's preflight reported "PASS: m1-c6 is ready" while demo/m1-c6-start had
   * never been cut, and neither had demo/m1-c5-captured, the branch the
   * walkthrough says it must be branched from. A clip cannot be ready when the
   * checkout its first line performs does not resolve.
   *
   * demo-checkout-refs-exist did not cover this: it scans runnable bash fences,
   * and the C6 runbook names its checkpoint in the AUTHOR PREP table rather than
   * in a fence -- which is itself the fix that check forced, so closing one hole
   * opened this one. This reads the declaration instead of the command.
   *
   * Reads git, so it ignores CHECK_ROOT.
   */
  'clip-start-checkpoint-exists': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const exists = (ref) => {
      for (const r of [ref, `origin/${ref}`]) {
        try {
          if (execSync(`git rev-parse --verify -q ${r}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) return true;
        } catch { /* try the next form */ }
      }
      return false;
    };
    const files = globSync('module*/m*-c*.md', { cwd: ROOT }).filter((f) => !f.includes('evidence'));
    let ok = true;
    let declared = 0;
    for (const f of files) {
      const row = read(f).split('\n').find((l) => /^\|\s*Starting checkpoint\s*\|/.test(l));
      if (!row) continue;                       // module 2 uses no demo branches
      const refs = [...row.matchAll(/`(demo\/[A-Za-z0-9._/-]+)`/g)].map((m) => m[1]);
      if (refs.length === 0) continue;
      declared += 1;
      for (const ref of refs) {
        if (!exists(ref)) {
          ok = reject(`${f} starts on ${ref}, which does not exist — this clip cannot be recorded yet`) && ok;
          ok = reject('  cut it by walking the clip before it; the chain and its capture points are in module1/walkthrough-c5-c6.md') && ok;
        }
      }
    }
    if (declared === 0) return reject('no runbook declares a starting checkpoint — the AUTHOR PREP table shape changed');
    return ok;
  },

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
   * The saved Run A prompt must match the runbook's, byte for byte, and open on
   * the skill line.
   *
   * The negative control is only valid if Run A and Run B differ by exactly one
   * line. Keeping the prompt in two places invites a second difference: edit the
   * runbook, forget the file, and the comparison silently stops measuring the
   * skill. Line 1 is asserted separately because Run B is defined as this file
   * without it.
   */
  /**
   * Every check is either run by a preflight or exempted here, with a reason.
   *
   * preflight-step-map-complete catches a check that is WIRED but unmapped. It
   * cannot see a check that is written and wired nowhere at all -- there is
   * nothing in the preflight for it to notice the absence of. Two Module 2
   * checks were added in one session and neither reached a preflight, so both
   * ran only in the full sweep and would not have fired before a recording. A
   * check nobody runs before recording does not fire when it matters.
   *
   * The exemptions are real and each names why. They are asserted from a
   * specific checkout by the walkthrough, and would fail by design from the seed
   * branches every preflight runs on -- wiring them would teach an author to
   * ignore a red line, which is worse than not running them.
   *
   * Proven red by removing a check's preflight invocation, and by exempting one
   * with an empty reason.
   */
  'every-check-is-wired': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const EXEMPT = {
      'c5-captured-opens-on-split': 'asserted from a demo/m1-c5-captured checkout at walkthrough step 4; fails by design on the seed branches a preflight runs from',
      'c6-start-opens-on-split': 'asserted from a demo/m1-c6-start checkout at walkthrough step 6; same reason',
    };
    const wired = new Set();
    for (const f of ['module1/scripts/preflight_check.sh', 'module2/scripts/preflight_check.sh']) {
      for (const m of read(f).matchAll(/check\.mjs["']?\s+([a-z0-9-]+)/g)) wired.add(m[1]);
    }
    let ok = true;
    for (const name of Object.keys(CHECKS)) {
      if (wired.has(name)) {
        if (EXEMPT[name]) ok = reject(`${name} is both wired and exempted -- drop the exemption, it is stale`);
        continue;
      }
      if (!EXEMPT[name]) {
        ok = reject(`${name} is not run by any preflight. A check nobody runs before recording does not fire when it matters -- wire it to the clip it guards, or exempt it in every-check-is-wired with the reason`);
      } else if (!EXEMPT[name].trim()) {
        ok = reject(`${name} is exempted with no reason given`);
      }
    }
    for (const name of Object.keys(EXEMPT)) {
      if (!(name in CHECKS)) ok = reject(`${name} is exempted but no longer exists -- remove the exemption`);
    }
    return ok;
  },

  /**
   * Module 2 clip 2 starts without its own answer already on disk.
   *
   * Gate 1 established that Codex persists a mid-thread correction to disk
   * rather than only to conversation context -- it edited four files to record
   * one. C2 step 4 produces exactly such a correction, and if it survives to the
   * next take the step's before-and-after is false: Codex appears to arrive at a
   * standard it was handed at the start.
   *
   * So step 4 names its output, automation/triage/corrected-sweep.json, and this
   * asserts the file is absent before a take. Same shape as clip 6's "route
   * contract suite starts empty": a leftover artifact does not fail anything
   * loudly, it just makes the demonstration untrue.
   *
   * The baseline beside it is the opposite case -- recorded, tracked, and
   * required to be present and unmodified, since it is the standard the
   * correction is compared against.
   *
   * Proven red with the corrected sweep left in place, and with the baseline
   * edited.
   */
  'm2-c2-starts-without-the-correction': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const OUT = 'automation/triage/corrected-sweep.json';
    const BASE = 'automation/triage/baseline-manual-sweep.json';
    let ok = true;
    if (existsSync(join(ROOT, OUT))) {
      ok = reject(`${OUT} exists before the take. C2 step 4 produces it, so a previous run's correction is still on disk and this clip would start from its own answer. ./module2/scripts/demo_reset.sh removes it`);
    }
    if (!existsSync(join(ROOT, BASE))) {
      return reject(`${BASE} is missing -- it is the recorded standard step 4 compares against`);
    }
    try {
      const dirty = execSync(`git status --porcelain -- ${BASE}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      if (dirty) ok = reject(`${BASE} is modified. It is the recorded baseline, not an output: git checkout -- ${BASE}`);
    } catch { /* no git, nothing to say */ }
    return ok;
  },

  /**
   * Module 2 clip 3 stays inside the Codex panel.
   *
   * Its fourth bullet -- "Verify Slack and Linear drafts preserve the evidence
   * and priority from the triage decision" -- reads as though it needs the
   * destinations open. Gate 1 measured what the plugins render in-thread and it
   * is enough: Linear reported its issue key, a link, and the priority it had
   * set; Slack rendered the message body with a clickable link.
   *
   * So the step is verified from the reply. Sending an author to a browser would
   * cost screen time, leave the surface the clip is about, and put a destination
   * on camera that this demo deliberately does not write to -- the drafts stay
   * drafts, and Gate 1's scratch-workspace run is the only place anything was
   * actually posted.
   *
   * Proven red on an instruction to open either destination.
   */
  'm2-c3-verifies-in-thread': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const FILE = 'module2/m2-c3-schedule-triage.md';
    const src = read(FILE);
    const step4 = src.slice(src.indexOf('## Step 4 '));
    const body = step4.slice(0, step4.indexOf('\n---'));
    let ok = true;
    const OPEN = /\b(open|switch to|go to|visit)\b[^.\n]{0,40}\b(slack|linear)\b/i;
    for (const line of body.split('\n')) {
      const m = line.match(OPEN);
      if (m && !/do not open/i.test(line)) {
        ok = reject(`${FILE}: step 4 says "${m[0]}" -- it is verified from Codex's in-thread reply, which Gate 1 measured as sufficient. A browser switch leaves the surface the clip is about`);
      }
    }
    if (!/Do not open Slack or Linear/i.test(body)) {
      ok = reject(`${FILE}: step 4 does not tell the author to stay in the Codex panel. Without it the bullet reads as though the destinations have to be opened`);
    }
    return ok;
  },

  /**
   * C6 step 1 asks for the conversions in a turn that creates nothing, in both
   * the runbook and the saved file.
   *
   * The conversions were once instruction three of seven in a single prompt that
   * also said "Then create ...". Twice, Codex produced both files correctly,
   * passed every gate, and said only "Implemented the GET /tickets/:id migration
   * slice" -- the second time, "Done. I added the migrated GET-only router." No
   * conversions either time.
   *
   * The cause is not ordering. A turn that contains something to hand back
   * resolves to the hand-back: the file is the evident deliverable and anything
   * before it compresses into a summary. Moving the sentence earlier leaves it in
   * the same turn as the file.
   *
   * This check was first written to protect a skill-on / skill-off comparison,
   * where prompt 1 was the only turn the two runs differed in. That comparison is
   * retired and the check is not, because its first reason never depended on it:
   *
   *   - the conversion list is step 1's Highlight, and in a combined turn the
   *     Highlight was absent entirely, twice
   *   - EO2d is now demonstrated rather than measured, and what it is
   *     demonstrated BY is the skill's guidance appearing in those stated
   *     conversions. A turn that skips them removes the demonstration
   *
   * Both files are read. Recombining in the runbook alone is caught by
   * c6-prompt-saved as a parity failure; recombining in both is what nothing
   * caught, and is the case this exists for.
   *
   * Proven red on: recombined in both files, recombined in the runbook only, the
   * first prompt losing its no-writing instruction, and the first prompt also
   * asking for a file.
   */
  'c6-step1-states-conversions-first': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const RUNBOOK = 'module1/m1-c6-migrate-one-express-route.md';
    const SAVED = 'plans/prompts/m1-c6-migrate-route.md';
    let ok = true;

    for (const [file, blocks] of [
      [RUNBOOK, (() => {
        const src = read(RUNBOOK);
        const step1 = src.slice(src.indexOf('## Step 1 '), src.indexOf('## Step 2 '));
        return [...step1.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
      })()],
      [SAVED, [...read(SAVED).matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]).slice(0, 2)],
    ]) {
      if (blocks.length < 2) {
        ok = reject(`${file}: step 1 sends ${blocks.length} prompt(s). The conversions need a turn of their own -- combined with the create, two measured runs skipped them entirely and returned only a summary, and the conversion list is this step's Highlight and what EO2d is demonstrated by`);
        continue;
      }
      const first = blocks[0].replace(/\s+/g, ' ');
      if (!/\bconversions\b/i.test(first)) {
        ok = reject(`${file}: step 1's first prompt never asks for the conversions -- they are the step's Highlight, and EO2d is demonstrated by the skill's guidance showing up in them`);
      }
      if (!/Do not create, edit or delete any file/i.test(first)) {
        ok = reject(`${file}: step 1's first prompt does not forbid writing. Without that it can produce the files and compress the reasoning into a summary, which is the failure the split exists to prevent`);
      }
      if (/\bcreate supporthub-api\//i.test(first)) {
        ok = reject(`${file}: step 1's first prompt also asks for a file to be created -- a turn with a deliverable in it resolves to the deliverable`);
      }
    }
    return ok;
  },

  /**
   * Every C6 prompt block matches its saved copy, in order.
   *
   * Step 1 is sent from plans/prompts/m1-c6-migrate-route.md rather than retyped,
   * so the runbook and that file are two places an author can paste from. When
   * they drift, Codex gets different instructions depending on which one was
   * open -- the defect c2-prompts-saved was written for, in the clip that had
   * already suffered it.
   *
   * This used to assert the skill-on/skill-off toggle as well: that line 1 of
   * prompt 1 was the skill line and appeared in no other block. That comparison
   * has been retired, so those assertions are gone and only parity remains.
   */
  'c6-prompt-saved': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const rb = onCameraPrompts('module1/m1-c6-migrate-one-express-route.md');
    // The saved file is prompts only, so it has no on-camera boundary to slice at.
    const saved = [...read('plans/prompts/m1-c6-migrate-route.md').matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
    if (rb.length === 0) return reject('m1-c6: no prompt blocks found -- the runbook shape changed');
    if (rb.length !== saved.length) {
      return reject(`m1-c6 has ${rb.length} prompts, plans/prompts/m1-c6-migrate-route.md has ${saved.length}`);
    }
    let ok = true;
    rb.forEach((body, i) => {
      if (body !== saved[i]) ok = reject(`m1-c6 prompt ${i + 1} differs from the saved copy`) && ok;
    });
    return ok;
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
   * routes/*.mts and watching this go red.
   *
   * Both extensions are listed. The migrated sources are .mts, because the
   * package cannot declare "type": "module" while any .js file remains, but a
   * .ts left behind by a run that ignored that would be just as much a dirty
   * baseline and this check would have missed it.
   */
  'no-route-migrated': () => {
    try {
      const out = execSync('ls supporthub-api/migration/routes/*.ts supporthub-api/migration/routes/*.mts 2>/dev/null || true');
      return out.toString().trim() === '';
    } catch { return true; }
  },

  /**
   * A runbook's `grep -c '^### X' <file>   # must be N` has to agree with the
   * file, read from the branch that clip starts on.
   *
   * This is the third assertion in this repository to be written against the
   * seeded plan's wording rather than its shape. The C6 prepare block grepped
   * '^### Checkpoint' while the plan uses '^### Milestone', so it returned 0
   * against its own expected 2 -- a verification an author would run on camera
   * and have to explain. splitPlanHolds had the same defect twice over, in its
   * required row label and in its Express-upgrade regex.
   *
   * A grep is only checkable against the state the clip actually opens on, so
   * the expected count is evaluated on the clip's Starting checkpoint branch
   * rather than on the working tree, where the same grep gives a different and
   * equally correct answer.
   *
   * Proven red three ways: the heading renamed, the count changed, and the
   * greppped file renamed.
   */
  'runbook-plan-greps-resolve': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const show = (ref, path) => {
      for (const r of [ref, `origin/${ref}`]) {
        try {
          return execSync(`git show ${r}:${path}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
        } catch { /* try the next form */ }
      }
      return null;
    };
    const files = globSync('module*/m*-c*.md', { cwd: ROOT }).filter((f) => !f.includes('evidence'));
    let ok = true;
    let checked = 0;
    for (const f of files) {
      const src = read(f);
      const row = src.split('\n').find((l) => /^\|\s*Starting checkpoint\s*\|/.test(l));
      const ref = row && (row.match(/`(demo\/[A-Za-z0-9._/-]+)`/) || [])[1];
      if (!ref) continue;
      const greps = [...src.matchAll(/grep -c '\^(#+ [A-Za-z][A-Za-z ]*)'\s+(\S+)[^\n]*?#\s*(?:must be|unchanged:)?\s*(\d+)/g)];
      for (const [line, heading, path, want] of greps) {
        const body = show(ref, path);
        if (body === null) {
          ok = reject(`${f}: \`${line.trim()}\` greps ${path}, which does not exist on ${ref}`);
          continue;
        }
        checked += 1;
        const got = body.split('\n').filter((l) => l.startsWith(heading)).length;
        if (got !== Number(want)) {
          ok = reject(`${f}: \`${line.trim()}\` expects ${want} but ${path} on ${ref} has ${got} lines starting "${heading}"`);
        }
      }
    }
    if (checked === 0) return reject('no runbook grep with an expected count was found — the verification block shape changed');
    return ok;
  },

  /**
   * docs/outline-clip-map.json matches the outline it claims to be transcribed
   * from.
   *
   * clip-outline-alignment compares every runbook to that map, and the map's own
   * comment calls it "transcribed verbatim from the outline's Course
   * Organization section". Nothing checked that. The map was the authority for
   * eight runbooks and was itself unverified -- the same shape as a check
   * asserting a seeded string, one level up.
   *
   * Checked by hand once against the .docx: all nine objectives and all
   * thirty-two bullets matched, and the only difference was the map folding
   * "(6 minutes)" into the title. docs/outline-course-organization.txt is the
   * extract that made that possible, and this keeps it true.
   *
   * Proven red on an edited objective, an edited bullet, a changed duration and
   * a dropped clip.
   */
  'outline-map-matches-source': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const SRC = 'docs/outline-course-organization.txt';
    const lines = read(SRC).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const norm = (v) => v.normalize('NFKC').replace(/’/g, "'").replace(/–/g, '-').trim();

    const clips = {};
    const objectives = {};
    let mod = null;
    let cur = null;
    for (const l of lines) {
      let m = l.match(/^Module (\d) – /);
      if (m) { mod = m[1]; continue; }
      m = l.match(/^([1-4])([a-d])\.\s+(.+)$/);
      if (m) { objectives[`EO${m[1]}${m[2]}`] = m[3].trim(); continue; }
      m = l.match(/^Terminal Objective:\s*(.+)$/);
      if (m) { objectives[`TO${Object.keys(objectives).filter((k) => k.startsWith('TO')).length + 1}`] = m[1].trim(); continue; }
      m = l.match(/^Clip (\d+):\s*(.+?)\s*\((\d+) minutes?\)$/);
      if (m && mod) {
        cur = `m${mod}-c${m[1]}`;
        clips[cur] = { title: m[2].trim(), minutes: Number(m[3]), objectives: [], bullets: [] };
        continue;
      }
      if (cur && l.startsWith('•')) {
        const b = l.replace(/^•\s*/, '').trim();
        if (b.startsWith('Learning Objectives:')) clips[cur].objectives = b.split(':')[1].split(',').map((x) => x.trim());
        else clips[cur].bullets.push(b);
      }
    }

    const map = JSON.parse(read('docs/outline-clip-map.json'));
    let ok = true;
    for (const [id, want] of Object.entries(objectives)) {
      const got = map.objectives[id];
      if (got === undefined) ok = reject(`${id} is in ${SRC} and missing from the map`);
      else if (norm(got) !== norm(want)) {
        ok = reject(`${id} wording differs from the outline\n      outline: ${want}\n      map    : ${got}`);
      }
    }
    for (const id of Object.keys(map.objectives)) {
      if (!(id in objectives)) ok = reject(`${id} is in the map and not in ${SRC}`);
    }
    for (const [id, want] of Object.entries(clips)) {
      const got = map.clips[id];
      if (!got) { ok = reject(`clip ${id} is in ${SRC} and missing from the map`); continue; }
      if (norm(got.title) !== norm(want.title)) {
        ok = reject(`${id} title differs\n      outline: ${want.title}\n      map    : ${got.title}`);
      }
      if (got.minutes !== want.minutes) ok = reject(`${id} is ${want.minutes} minutes in the outline, ${got.minutes} in the map`);
      if (got.objectives.join(',') !== want.objectives.join(',')) {
        ok = reject(`${id} objectives are ${want.objectives.join(',')} in the outline, ${got.objectives.join(',')} in the map`);
      }
      if (got.bullets.length !== want.bullets.length) {
        ok = reject(`${id} has ${want.bullets.length} bullets in the outline, ${got.bullets.length} in the map`);
        continue;
      }
      want.bullets.forEach((b, i) => {
        if (norm(b) !== norm(got.bullets[i])) {
          ok = reject(`${id} bullet ${i + 1} differs\n      outline: ${b}\n      map    : ${got.bullets[i]}`);
        }
      });
    }
    for (const id of Object.keys(map.clips)) {
      if (!(id in clips)) ok = reject(`clip ${id} is in the map and not in ${SRC}`);
    }
    return ok;
  },

  /**
   * Every cut procedure branches before it commits.
   *
   * The walk leaves a checkpoint branch dirty. Committing there and then
   * branching lands the work on the checkpoint and leaves it pointing at it, so
   * the starting state a clip opens on becomes the end state that clip produces
   * -- silently, and only visible the next time someone walks it.
   *
   * Step 3 of the walkthrough had the right order and said why. Step 9 had the
   * two lines reversed and was about to be run that way. Nothing compared them,
   * because the two blocks are forty lines apart and both look reasonable read
   * on their own.
   *
   * Proven red by swapping the lines back in either block.
   */
  'cut-blocks-branch-before-committing': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const FILE = 'module1/walkthrough-c5-c6.md';
    const src = read(FILE);
    let ok = true;
    let seen = 0;
    for (const b of src.matchAll(/```bash\n([\s\S]*?)\n```/g)) {
      const lines = b[1].split('\n').map((l) => l.trim());
      const branch = lines.findIndex((l) => /^git checkout -b demo\//.test(l));
      const commit = lines.findIndex((l) => /^git commit\b/.test(l));
      if (branch < 0 || commit < 0) continue;
      seen += 1;
      if (commit < branch) {
        ok = reject(`${FILE}: \`${lines[branch]}\` comes after \`${lines[commit]}\` -- that commits the walk onto the checkpoint branch and leaves it there, so the state the clip starts from becomes the state it produces. Branch first`);
      }
    }
    if (seen === 0) return reject(`${FILE}: no cut block found -- the walkthrough shape changed`);
    return ok;
  },

  /**
   * demo/m1-c6-start must descend from demo/m1-c5-captured.
   *
   * module1/walkthrough-c5-c6.md opens on this as "the one mis-cut in the chain
   * that fails silently": m1-c6-start is defined by opening on the two-checkpoint
   * split C5 produces, and cut from anywhere else it carries the combined
   * milestone instead. The walkthrough gave the operator a merge-base command and
   * nothing asserted it, so it was checked by hand or not at all.
   *
   * It broke without anyone noticing. Doc fixes were cherry-picked onto both
   * branches independently, which gives identical trees and unrelated commits --
   * the guard flipped to failing while the content stayed correct, so the next
   * author to run it would have read a mis-cut that had not happened. Carry
   * changes onto m1-c5-captured and move m1-c6-start to it; never onto both.
   *
   * Trees are compared as well as ancestry, because ancestry alone would accept
   * m1-c6-start having drifted ahead of the split it is supposed to open on.
   *
   * Proven red by pointing m1-c6-start at the build branch, which is exactly the
   * mis-cut the walkthrough describes, and by committing on top of it.
   */
  'c6-start-descends-from-c5-captured': () => {
    // Published refs are the subject, and a stale local is a different problem
    // from a wrongly cut branch. Conflating them printed
    // `git branch -f demo/m1-c6-start demo/m1-c5-captured` at an author whose
    // demo/m1-c6-start was fine -- their local demo/m1-c5-captured was behind
    // origin. That command rewrites the start branch to C5's captured state, and
    // git refused it only because the branch happened to be checked out.
    //
    // c2-refs-identical had already been rebuilt for exactly this, in this file.
    // A remediation must name the ref it believes is wrong, and say why, so an
    // author can disagree with it before running it.
    const rev = (ref) => {
      try {
        return execSync(`git rev-parse --verify -q ${ref}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      } catch { return ''; }
    };
    const CAPTURED = 'demo/m1-c5-captured';
    const START = 'demo/m1-c6-start';
    const say = (l) => process.stderr.write(`  ${l}\n`);

    // Report local drift first, whatever the outcome: it is the likeliest cause
    // of a surprising verdict, and the fix is per branch -- never the other one.
    let drifted = 0;
    for (const b of [CAPTURED, START]) {
      const local = rev(b);
      const remote = rev(`origin/${b}`);
      if (local && remote && local !== remote) {
        drifted += 1;
        say(`local ${b} is ${local.slice(0, 7)}, origin has ${remote.slice(0, 7)} — the local one is not what was published`);
        say(`  git fetch origin --prune && git branch -f ${b} origin/${b}`);
      }
    }

    const captured = rev(`origin/${CAPTURED}`) || rev(CAPTURED);
    const startRef = rev(`origin/${START}`) || rev(START);
    if (!captured || !startRef) {
      say(`${!captured ? CAPTURED : START} does not resolve — walk the clip before it; the chain is in module1/walkthrough-c5-c6.md`);
      return false;
    }
    try {
      execSync(`git merge-base --is-ancestor ${captured} ${startRef}`, { stdio: 'ignore' });
    } catch {
      say(`${START} (${startRef.slice(0, 7)}) does not descend from ${CAPTURED} (${captured.slice(0, 7)}) in the repository`);
      say(`  ${START} is the branch to move, because it is defined as branched from ${CAPTURED}:`);
      say(`  git branch -f ${START} ${CAPTURED}`);
      say(`  do not move ${CAPTURED} — it carries the split C5 produced`);
      return false;
    }
    if (rev(`${captured}^{tree}`) !== rev(`${startRef}^{tree}`)) {
      say(`${START} has drifted from the split ${CAPTURED} recorded — it must open on that state, not a later one`);
      say(`  git branch -f ${START} ${CAPTURED}`);
      return false;
    }
    if (drifted) say('note: the published refs are correct; only the local branches above differ');
    return true;
  },

  /**
   * No on-camera verification may read a file the agent writes at a fixed line
   * offset.
   *
   * Fifth instance of 11c and the same shape as the fourth: C6 step 4 ran
   * `grep -A4 "## Behavioral exceptions" plans/migration-plan.md`, and the
   * exception Codex had just recorded sat below line 4. The command printed the
   * heading and two intro lines and stopped, so a correct run and a run that
   * recorded nothing looked identical. -A4 is the line-count equivalent of
   * grepping for a variable name: a guess about how much an agent will write.
   *
   * Sweeping every runbook found two more, both in C3 and both against
   * plans/ExecPlan.md, which Codex writes on camera in that clip -- an ExecPlan
   * recording five gates instead of four, or two deferred rows instead of one,
   * would have been silently truncated.
   *
   * "A file the agent writes" is taken from the runbook itself: any path named
   * inside one of its own ```text prompt blocks is a file that clip asks Codex
   * to produce. Offsets against files nobody asks an agent to write are not
   * flagged, and prose describing the old form is not either -- only ```bash
   * blocks after ON-CAMERA are read.
   *
   * The replacement prints a whole section regardless of length:
   *
   *     awk '/^## /{p = /^## Behavioral exceptions/} p' plans/migration-plan.md
   *
   * Proven red on each of the three real sites, and on -B and -C forms.
   */
  'no-fixed-offsets-into-agent-files': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const files = globSync('module*/m*-c*.md', { cwd: ROOT }).filter((f) => !f.includes('evidence'));
    let ok = true;
    let scanned = 0;
    for (const f of files) {
      const src = read(f);
      const i = src.indexOf('# ON-CAMERA');
      if (i < 0) continue;
      scanned += 1;
      // Paths this clip's own prompts ask Codex to write.
      const written = new Set();
      for (const b of src.matchAll(/```text\n([\s\S]*?)\n```/g)) {
        for (const m of b[1].matchAll(/\b((?:plans|supporthub-api|docs)\/[A-Za-z0-9._/-]+)/g)) written.add(m[1]);
      }
      if (written.size === 0) continue;
      for (const b of src.slice(i).matchAll(/```bash\n([\s\S]*?)\n```/g)) {
        for (const cmd of b[1].replace(/\\\n\s*/g, ' ').split('\n')) {
          const off = cmd.match(/-([ABC])\s*(\d+)/);
          if (!off) continue;
          const target = [...written].find((w) => cmd.includes(w));
          if (target) {
            ok = reject(`${f}: \`${cmd.trim()}\` reads ${target} at a fixed -${off[1]}${off[2]} offset, and this clip's own prompts ask Codex to write that file. How many lines it writes is its choice. Print the section instead: awk '/^## /{p = /^## <heading>/} p' ${target}`);
          }
        }
      }
    }
    if (scanned === 0) return reject('no runbook has an ON-CAMERA section -- the runbook shape changed');
    return ok;
  },

  /**
   * A runbook may grep an agent-authored file for contract values, never for a
   * name the agent chose.
   *
   * Fourth instance of 11c, and the first inside a step verification rather than
   * a check. C6 step 3 ran
   * `grep -c "expect(res.status)" .../ticket-read.route.test.mts` and returned 0
   * on a run that was entirely correct: Codex named the variable `response`.
   * All four status codes were asserted, one each, exactly as the runbook said
   * they would be.
   *
   * The discriminator is who writes the file being grepped. Five of the six
   * greps in these runbooks target plans/ files this repository authors, where a
   * heading is a fixed shape and runbook-plan-greps-resolve keeps the counts
   * honest. Only the ones aimed at what an agent produces are coin flips, and
   * only there does an identifier appear in the pattern.
   *
   * So: greps at the artifacts C6 creates may not contain a receiver-property
   * pattern like `res.status` or `response.body`. Status codes, field names and
   * error strings are all in the prompt and the behavioral contract; variable
   * names, matcher choice and `.status` against `.statusCode` are not.
   *
   * Proven red on the exact regression -- `expect(res.status)` put back -- and
   * on a `response.body` variant, so it is not keyed to one identifier.
   */
  'agent-file-greps-assert-contract-values': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const RUNBOOK = 'module1/m1-c6-migrate-one-express-route.md';
    const ARTIFACTS = [
      'supporthub-api/migration/routes/ticketRead.mts',
      'supporthub-api/migration/tests/contracts/ticket-read.route.test.mts',
    ];
    const src = read(RUNBOOK);
    const camera = src.slice(src.indexOf('# ON-CAMERA'));
    let ok = true;
    let seen = 0;
    for (const block of camera.matchAll(/```bash\n([\s\S]*?)\n```/g)) {
      // Join continuations so a grep split across lines is read as one command.
      for (const cmd of block[1].replace(/\\\n\s*/g, ' ').split('\n')) {
        if (!/\bgrep\b/.test(cmd)) continue;
        if (!ARTIFACTS.some((a) => cmd.includes(a))) continue;
        seen += 1;
        const ident = cmd.match(/[A-Za-z_$][\w$]*\.(?:status|statusCode|body|headers|text)\b/);
        if (ident) {
          ok = reject(`${RUNBOOK}: \`${cmd.trim()}\` greps an agent-authored file for "${ident[0]}" -- the receiver is a name Codex picks, not a contract value. Count the status codes, field names or error strings instead`);
        }
      }
    }
    if (seen === 0) return reject(`${RUNBOOK}: no on-camera grep targets either migrated artifact -- the verification shape changed`);
    return ok;
  },


  /**
   * Clip 6 step 1 proves its two files exist, by name, before anything else.
   *
   * Two measured runs reported both files created and all five migration gates
   * green having written neither, and described a working tree that had been
   * true of an earlier run. A reported gate pass is not a gate pass: nothing can
   * have linted, type-checked, built and tested files that are not on disk.
   *
   * The step's verification used to enumerate only prohibitions -- wrong
   * workspace, wrong scope -- so the state that actually occurred, nothing at
   * all, was not in the list an author skims for what to worry about.
   *
   * What is assertable here is narrow, and worth being explicit about: this
   * check CANNOT assert the two files exist. Before the demo they must not --
   * no-route-migrated and the preflight's "route contract suite starts empty"
   * both require their absence, and that absence is what makes the step's
   * before-and-after real. So what is asserted is that the runbook's step 1
   * verification contains a positive existence test naming both artifacts, and
   * that it comes first in the block, since the ordering is the fix.
   *
   * Proven red three ways: the existence test removed, one of the two paths
   * dropped from it, and the test demoted below git status.
   */
  /**
   * Every prep block makes the agent prove it is in this checkout.
   *
   * Two directories on the recording machine shared the basename
   * pluralsight-openai-codex-scale -- one under Documents/ChatGPT/, the real
   * repository a level up -- and Codex Desktop's project pointed at the copy,
   * which sits on a `master` branch this repository does not have. Two C6 Step
   * 1 runs reported both files created and all five gates green while neither
   * file reached disk. The reports were accurate. They were about a different
   * checkout.
   *
   * Nothing downstream can catch that: every verification in every runbook
   * reads the terminal's checkout, and the agent was never in it. So the probe
   * is a precondition, and it has to survive edits to these files.
   *
   * Asserted per runbook: the agent is asked for an ABSOLUTE working directory
   * and a BRANCH; the terminal prints both to compare against; the clip's own
   * starting branch is named, so the comparison has a right answer; and the
   * block warns against comparing the project NAME, which is the one field
   * that was identical between the two folders.
   */
  'runbooks-probe-agent-identity': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const RUNBOOKS = [
      ['module1/m1-c2-map-noisy-typescript-modules.md', 'demo/m1-c2-start'],
      ['module1/m1-c3-execute-codex-refactor.md', 'demo/m1-c3-start'],
      ['module1/m1-c5-inventory-legacy-express4.md', 'demo/m1-c5-start'],
      ['module1/m1-c6-migrate-one-express-route.md', 'demo/m1-c6-start'],
      ['module2/m2-c2-manual-triage.md', 'demo/m2-c2-start'],
    ];
    let ok = true;
    for (const [file, branch] of RUNBOOKS) {
      // The prep block is everything before ON-CAMERA; a probe after the first
      // prompt has already let a wrong-checkout run start.
      const whole = read(file);
      const cut = whole.search(/^#+ *ON-CAMERA/m);
      const prepRaw = cut < 0 ? whole : whole.slice(0, cut);
      // Collapsed for prose assertions, which must not be coupled to hard wraps.
      // Line-anchored assertions read prepRaw instead: the PASS clause names
      // `pwd` in prose, so a substring match would pass on a block that never
      // runs it.
      const prep = prepRaw.replace(/\s+/g, ' ');
      const need = [
        [/absolute[^.]{0,40}\bworking director/i,
          'ask the agent for its ABSOLUTE working directory -- a relative path or a folder name cannot tell the two checkouts apart'],
        [/\bprint\b[^.]{0,80}\bbranch\b|\bbranch\b[^.]{0,80}\bprint\b/i,
          'ask the agent for its current branch -- it is the half of the test that does not depend on reading a long path carefully'],
        [/^\s*pwd\s*$/m,
          'run pwd in the terminal, so the agent\'s answer has something to be compared against (naming it in the PASS clause is not running it)',
          true],
        [/^\s*git rev-parse --abbrev-ref HEAD\s*$/m,
          'run git rev-parse --abbrev-ref HEAD in the terminal too, for the same reason',
          true],
        [new RegExp(branch.replace(/[/-]/g, '\\$&')),
          `name ${branch} in the prep block, so "does it match" has a right answer`],
        [/\bname\b[^.]{0,120}\b(identical|truncat|same)|\b(identical|truncat|same)\b[^.]{0,120}\bname\b/i,
          'warn that the project NAME cannot distinguish the two folders -- it was identical, and it is the field the eye goes to'],
      ];
      for (const [re, what, lineAnchored] of need) {
        if (!re.test(lineAnchored ? prepRaw : prep)) {
          ok = reject(`${file}: the prep block does not ${what}`);
        }
      }
    }
    return ok;
  },

  /**
   * Every baseline priority is derivable from the rubric and the fixtures.
   *
   * incident-2001 sat at P0 for the life of this repository and could not be
   * derived. The rubric's affected-user column cannot separate P0 from P1 --
   * P0 says "Any number", which subsumes P1's "100 or more" -- and the
   * workaround column cannot either, since P1 admits "None, or manual only".
   * The sole discriminator is the Impact column: P0 is "unavailable; data loss
   * or corruption", P1 is "degraded or failing for many users". The fixture's
   * own evidence describes a subset of status updates failing, which is
   * degraded. So the rubric applied literally -- which is what step 2's prompt
   * demands -- yields P1, and the walk's Codex said so, quoting the row.
   *
   * Step 4 calls this file "the rubric-derived baseline". This makes that true
   * rather than asserted. Bands are read from docs/triage-rubric.md rather than
   * hardcoded, so lowering the P1 threshold (which is exactly what C5's seeded
   * diff does) cannot leave this check silently measuring the old one.
   */
  'baseline-priorities-derive-from-rubric': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const rubric = read('docs/triage-rubric.md');
    // | **P1** | impact | 100 or more | workaround | response |
    const row = (p) => {
      const m = rubric.match(new RegExp(`^\\|\\s*\\*\\*${p}\\*\\*\\s*\\|([^|]*)\\|([^|]*)\\|`, 'm'));
      return m && { impact: m[1].trim(), users: m[2].trim() };
    };
    const rows = {};
    for (const p of ['P0', 'P1', 'P2', 'P3']) {
      rows[p] = row(p);
      if (!rows[p]) return reject(`docs/triage-rubric.md has no ${p} row in the priority table -- the baseline cannot be derived from a rubric that does not define its bands`);
    }
    // Bands come from the rubric text: "100 or more", "10 to 99", "Fewer than 10".
    const band = (spec) => {
      let m = spec.match(/(\d+)\s*or more/i);
      if (m) return [Number(m[1]), Infinity];
      m = spec.match(/(\d+)\s*to\s*(\d+)/i);
      if (m) return [Number(m[1]), Number(m[2])];
      m = spec.match(/fewer than\s*(\d+)/i);
      if (m) return [0, Number(m[1]) - 1];
      if (/any number/i.test(spec)) return [0, Infinity];
      return null;
    };
    const base = JSON.parse(read('automation/triage/baseline-manual-sweep.json'));
    const { issues } = JSON.parse(read('automation/sentry-fixtures/issues.json'));
    let ok = true;
    for (const f of base.findings) {
      if (f.priority === 'deferred') {
        if (f.confidence !== 'low') {
          ok = reject(`baseline ${f.id} is deferred but its confidence is "${f.confidence}". The rubric defers on low confidence; deferring a high-confidence finding is a judgement the rubric does not license`);
        }
        continue;
      }
      const r = rows[f.priority];
      if (!r) { ok = reject(`baseline ${f.id} has priority "${f.priority}", which the rubric does not define`); continue; }
      const b = band(r.users);
      if (!b) { ok = reject(`the rubric's ${f.priority} affected-user column reads "${r.users}", which is not a band this check can read`); continue; }
      if (f.affectedUsers < b[0] || f.affectedUsers > b[1]) {
        ok = reject(`baseline ${f.id} is ${f.priority} with ${f.affectedUsers} affected users, outside the rubric's ${f.priority} band of "${r.users}"`);
      }
      // The band alone cannot justify P0: its column subsumes every other, so
      // the Impact column is the whole derivation. Read that from the SOURCE
      // issues, not from the baseline's own evidence string -- the first draft
      // of this clause tested the baseline's prose and passed a restored P0,
      // because the sentence earns its P1 by saying the impact is "rather than
      // unavailable". A summary that argues for a verdict cannot be the
      // verification of it.
      if (f.priority === 'P0') {
        const ids = [f.id, ...(f.merged || [])];
        const sourced = issues.filter((i) => ids.includes(i.id));
        if (sourced.length === 0) {
          ok = reject(`baseline ${f.id} is P0 but matches no issue in the sentry fixture, so its impact cannot be checked against the rubric's P0 row -- "${r.impact}"`);
        } else if (!sourced.some((i) => /\bunavailable\b|\bdata loss\b|\bcorrupt/i.test(`${i.userImpact || ''}`))) {
          ok = reject(`baseline ${f.id} is P0, but no source issue among ${ids.join(', ')} reports what the rubric's P0 row requires -- "${r.impact}". P0's affected-user column is "${r.users}", which cannot separate it from P1, so the impact claim is the entire derivation and it has to come from the evidence rather than the baseline's own summary`);
        }
      }
    }
    return ok;
  },

  /**
   * The evidence fixtures state facts, never the finding a later step audits.
   *
   * automation/github-seed/commits.json carried a `note` on every commit --
   * "Touches changeStatus, the frame both evt-1042 and evt-1043 share", "Touches
   * no application code on the failing path", "the evidence for evt-1099 is too
   * thin to correlate" -- and a top-level comment saying the real root cause was
   * older than the misleading one. All three of C2 step 3's findings were
   * written into the data step 2 reads. The walk's Codex rejected d4e5f6a in
   * almost the words of the note.
   *
   * This is section 11a one level down: a prompt may not impose the rule a later
   * step audits, and a fixture may not state the finding.
   *
   * Asserted as a shape, not a vocabulary: record fields are whitelisted, and a
   * file-level comment may describe the file's contract but may not mention any
   * individual record -- reasoning about a specific sha or issue id is what an
   * answer key does.
   */
  /**
   * C2 step 4's expected result names the same priorities the baseline holds.
   *
   * The step tells the author what to expect in prose and then verifies against
   * automation/triage/baseline-manual-sweep.json. Those are two statements of
   * one fact, in two files, and they drifted the moment the baseline's
   * incident-2001 moved off P0 -- leaving the runbook telling the author to
   * expect a priority the verification would reject.
   */
  'runbook-expects-the-baseline-it-compares-to': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const base = JSON.parse(read('automation/triage/baseline-manual-sweep.json'));
    // Each runbook, and the heading its expected result sits under. C2 step 4
    // produces the corrected report; C3 step 2 runs the scheduled sweep and
    // prints the baseline table beside it, on camera.
    const SECTIONS = [
      ['module2/m2-c2-manual-triage.md', '## Step 4'],
      ['module2/m2-c3-schedule-triage.md', '## Step 2'],
    ];
    let ok = true;
    for (const [file, heading] of SECTIONS) {
      const doc = read(file);
      const from = doc.indexOf(heading);
      if (from < 0) { ok = reject(`${file}: no "${heading}" section, so its expected result cannot be checked against the baseline`); continue; }
      const next = doc.indexOf('\n## ', from + 1);
      const section = doc.slice(from, next < 0 ? doc.length : next);

      let named = 0;
      for (const f of base.findings) {
        const m = section.match(new RegExp(`\`${f.id}\`[^.\\n]{0,40}?\\b(P[0-3]|deferred)\\b`));
        if (!m) continue;
        named += 1;
        if (m[1] !== f.priority) {
          ok = reject(`${file} ${heading}: the expected result says ${f.id} is ${m[1]}, the baseline it is compared against holds ${f.priority}`);
        }
      }
      if (named === 0) {
        ok = reject(`${file} ${heading}: names no baseline finding with a priority, so the author has no expectation to judge a take by before running the verification`);
      } else if (named !== base.findings.length) {
        ok = reject(`${file} ${heading}: names ${named} of the baseline's ${base.findings.length} findings with a priority`);
      }

      // Any transcribed table of the baseline is output that appears on camera,
      // so every field in it has to be what the command actually prints.
      for (const block of section.matchAll(/```text\n([\s\S]*?)\n```/g)) {
        for (const line of block[1].split('\n')) {
          const row = line.match(/^\s*(\S+)\s+(P[0-3]|deferred)\s+users=(\d+)\s+route=(true|false)\s*$/);
          if (!row) continue;
          const [, id, priority, users, route] = row;
          const f = base.findings.find((x) => x.id === id);
          if (!f) { ok = reject(`${file} ${heading}: a transcribed table row names ${id}, which the baseline does not hold`); continue; }
          if (priority !== f.priority) ok = reject(`${file} ${heading}: the transcribed table shows ${id} at ${priority}; the baseline prints ${f.priority}, and this block is on camera`);
          if (Number(users) !== f.affectedUsers) ok = reject(`${file} ${heading}: the transcribed table shows ${id} at ${users} users; the baseline prints ${f.affectedUsers}`);
          if ((route === 'true') !== Boolean(f.route)) ok = reject(`${file} ${heading}: the transcribed table shows ${id} route=${route}; the baseline prints ${Boolean(f.route)}`);
        }
      }
    }
    return ok;
  },

  /**
   * Each seeded run's hunks are traceable to its findings, or provably are not.
   *
   * The runs used to declare it: every hunk carried a verdict of "valid" or
   * "invalid" and a why, and the preflight asserted the scenario by reading
   * them. Those verdicts ARE C5 step 2's and C6 step 2's work -- "does the
   * finding ask for this change?" -- sitting in a file the agent reads. So they
   * are gone, and the shape is derived here instead.
   *
   * Derived the way the demo teaches it: a hunk is asked for when the file it
   * touches appears in the evidence of a finding the run was given -- a stack
   * frame, or the fix that finding recommends. run-3001 must carry one of each,
   * because a review with nothing to reject teaches nothing; and the hunk that
   * is not asked for must be the rubric, since editing the standard you are
   * judged by is the specific move C5 is about. run-3002 must carry at least one
   * asked-for hunk, or there is nothing for C6 to preserve.
   */
  /**
   * Every draft carries the priority its finding was triaged at.
   *
   * C3 step 4 verifies that Slack and Linear drafts "preserve the evidence and
   * priority from the triage decision", and both incident-2001 drafts said P0
   * for the whole life of this repository -- title, priority field, label, and
   * the first line of the Slack text. When the baseline moved to P1 they became
   * four more places to drift, on camera, in the step whose subject is exactly
   * that they do not.
   *
   * The priority is checked everywhere it is written, not only in the field
   * named `priority`: a draft whose field says P1 under a title reading "P0:"
   * is the failure this step is about.
   */
  'drafts-carry-the-triaged-priority': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const base = JSON.parse(read('automation/triage/baseline-manual-sweep.json'));
    const byId = Object.fromEntries(base.findings.map((f) => [f.id, f]));
    let ok = true;
    let seen = 0;
    for (const dir of ['automation/linear-drafts', 'automation/slack-drafts']) {
      for (const file of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.json')).sort()) {
        const draft = JSON.parse(read(`${dir}/${file}`));
        const f = byId[draft.sourceFinding];
        if (!f) { ok = reject(`${dir}/${file} is a draft for ${draft.sourceFinding}, which the baseline does not hold`); continue; }
        seen += 1;
        if (draft.status !== 'draft' || draft.approvedBy !== null) {
          ok = reject(`${dir}/${file} is not an unapproved draft. Slack and Linear are draft-only in this course; nothing is sent or created until a human approves`);
        }
        // Only the fields that ASSERT a priority: the structured ones and the
        // headline. A body may reason about the bands -- incident-2002's draft
        // explains that a workaround puts it at P2 "rather than P1", and a
        // blanket scan over prose rejects that correct sentence, which is the
        // same mistake as testing a summary for the verdict it argues.
        const asserted = [
          ['title', draft.title],
          ['priority', draft.priority],
          ['text (headline)', (draft.text || '').split('\n')[0]],
        ];
        for (const [field, value] of asserted) {
          if (!value) continue;
          for (const m of String(value).matchAll(/\bP([0-3])\b/gi)) {
            if (`P${m[1]}` !== f.priority) {
              ok = reject(`${dir}/${file}: ${field} says P${m[1]}; ${f.id} is triaged ${f.priority}. C3 step 4 verifies on camera that the drafts preserve the triage priority`);
            }
          }
        }
        for (const label of draft.labels || []) {
          if (/^p[0-3]$/i.test(label) && label.toLowerCase() !== f.priority.toLowerCase()) {
            ok = reject(`${dir}/${file}: label "${label}" does not match ${f.id}'s triaged ${f.priority}`);
          }
        }
        if (draft.priority && draft.priority !== f.priority) {
          ok = reject(`${dir}/${file}: priority ${draft.priority} does not match ${f.id}'s triaged ${f.priority}`);
        }
      }
    }
    if (seen === 0) return reject('no drafts found under automation/linear-drafts or automation/slack-drafts');
    return ok;
  },

  /**
   * No preflight invokes check() before check() exists.
   *
   * A new all-scoped block was spliced into the middle of a prose comment --
   * "Every check is already scoped -- check "all" gates every clip" -- because
   * the insertion anchored on the first literal occurrence of that string in the
   * file, which was the sentence rather than an invocation. The block escaped
   * the comment and ran at line 32, fifty lines above the function definition,
   * so the author's terminal opened with "check: command not found".
   *
   * `bash -n` passed: the file is valid shell, it just calls a function that is
   * not defined yet. And the runs that were supposed to catch it discarded
   * stderr, so a broken script reported success -- which is the same failure as
   * reading an agent's summary instead of the artifact, one layer down. Read
   * stderr when you run these; this check is the part a machine can do.
   */
  /**
   * C2 step 4's prompt names every key its verification then reads.
   *
   * Walk 2 matched the baseline on all four priorities and user counts, and
   * showed `route=absent` for every finding. Codex had answered the question --
   * it wrote `routedNow` and a nested `routing.routed`, all false -- but that
   * answers "was this routed", while the baseline's `route` records "should this
   * be routed". Both correct, for different questions, and the whole difference
   * was a key the prompt never named.
   *
   * This is section 11c with a JSON key in place of a grep: an assertion tests
   * the contract value rather than the identifier it happened to see first. When
   * the contract value IS an identifier, the prompt has to state it, and the
   * three places that must agree -- prompt, verification selector, baseline --
   * are checked against each other here.
   */
  'c2-step4-names-the-keys-it-compares': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const RUNBOOK = 'module2/m2-c2-manual-triage.md';
    const doc = read(RUNBOOK);
    const from = doc.indexOf('## Step 4');
    if (from < 0) return reject(`${RUNBOOK}: no step 4`);
    const next = doc.indexOf('\n## ', from + 1);
    const step = doc.slice(from, next < 0 ? doc.length : next);
    const prompt = (step.match(/```text\n([\s\S]*?)\n```/) || [, ''])[1];
    if (!prompt.trim()) return reject(`${RUNBOOK}: step 4 has no prompt block`);

    const base = JSON.parse(read('automation/triage/baseline-manual-sweep.json'));
    const finding = base.findings[0] || {};
    let ok = true;

    // Every field the verification selects out of $OUT's findings.
    const selectors = new Set();
    for (const m of step.matchAll(/json\.mjs table "\$OUT"\s+(\S+)\s+([^\n]*)/g)) {
      selectors.add(m[1]);
      for (const spec of m[2].trim().split(/\s+/)) {
        const field = spec.replace(/^[^=]+=/, '').replace(/:\d+$/, '');
        if (field) selectors.add(field);
      }
    }
    // `fields` reads the same file by the same keys and drifts the same way.
    for (const m of step.matchAll(/json\.mjs fields "\$OUT"\s+([^\n]*)/g)) {
      for (const spec of m[1].match(/"[^"]+"/g) || []) {
        const field = spec.slice(1, -1).replace(/^[^=]+=/, '');
        // A path selector is satisfied by its root: the prompt names the
        // structure, not every index into it.
        if (field) selectors.add(field.split('.')[0]);
      }
    }
    if (selectors.size === 0) {
      return reject(`${RUNBOOK}: step 4's verification reads no fields out of $OUT, so nothing ties the prompt to the comparison`);
    }
    // Naming a key means naming it as a key: quoted, or introduced as the first
    // token of a schema line. A bare substring is not enough -- walk 2's prompt
    // said "state whether it should be routed", and `includes('route')` matches
    // the word "routed", so a substring test would have passed on the very
    // prompt that produced route=absent.
    const names = (field) => new RegExp(`(["'\`]${field}["'\`])|(^\\s{2,}${field}\\s{2,}\\S)`, 'm').test(prompt);
    for (const field of selectors) {
      if (!names(field)) {
        ok = reject(`${RUNBOOK}: step 4 compares "${field}" but its prompt never names it. Codex will pick its own key, the table prints ${field}=absent, and that reads as a wrong decision rather than a differently named one`);
      }
      // A selector may name a top-level key or a per-finding one; the baseline
      // holds rejectedCorrelations at the top and priority inside each finding.
      const inBaseline = field in base || field in finding;
      if (!inBaseline) {
        ok = reject(`${RUNBOOK}: step 4 compares "${field}", which the baseline it compares against does not hold`);
      }
    }
    return ok;
  },

  'preflight-checks-run-after-their-definition': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    let ok = true;
    for (const file of ['module1/scripts/preflight_check.sh', 'module2/scripts/preflight_check.sh']) {
      const lines = read(file).split('\n');
      const defined = lines.findIndex((l) => /^\s*check\s*\(\s*\)\s*\{/.test(l));
      if (defined < 0) { ok = reject(`${file}: defines no check() function`); continue; }
      lines.forEach((l, i) => {
        if (!/^\s*check\s+["']/.test(l)) return;
        if (i < defined) {
          ok = reject(`${file}:${i + 1} calls check before check() is defined at line ${defined + 1}. An invocation this far up is spliced text, not a check -- the shell reports "check: command not found" and the run continues without it`);
        }
      });
      // The splice also left a bare, unquoted invocation behind. Every real one
      // passes a quoted scope and a quoted title.
      lines.forEach((l, i) => {
        if (i < defined) return;
        if (!/^check\s/.test(l)) return;
        if (!/^check\s+"(all|c\d)"\s+"/.test(l)) {
          ok = reject(`${file}:${i + 1} is a check invocation that does not open with a quoted scope and a quoted title: ${l.trim().slice(0, 60)}`);
        }
      });
    }
    return ok;
  },

  'seeded-run-hunks-trace-to-findings': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const base = JSON.parse(read('automation/triage/baseline-manual-sweep.json'));
    const { issues } = JSON.parse(read('automation/sentry-fixtures/issues.json'));
    const RUBRIC = 'docs/triage-rubric.md';

    // Every file a finding's own evidence points at: the stack frames of the
    // issues it merges, plus any file its recommendation names.
    const filesFor = (id) => {
      const f = base.findings.find((x) => x.id === id);
      if (!f) return null;
      const ids = [f.id, ...(f.merged || [])];
      const files = new Set();
      for (const i of issues.filter((x) => ids.includes(x.id))) {
        for (const frame of i.stack || []) {
          const m = frame.match(/\(([^:]+):/);
          if (m) files.add(m[1]);
        }
      }
      for (const m of `${f.recommendation || ''} ${f.evidence || ''}`.matchAll(/[\w./-]+\.(?:ts|mts|js|json|md)/g)) {
        files.add(m[0]);
      }
      return files;
    };

    let ok = true;
    const asked = {};
    for (const runId of ['run-3001', 'run-3002', 'run-3003']) {
      const run = JSON.parse(read(`automation/runs/${runId}.json`));
      const evidenceFiles = new Set();
      for (const id of run.sourceFindings || []) {
        const fs = filesFor(id);
        if (!fs) { ok = reject(`${runId} names source finding ${id}, which the baseline does not hold`); continue; }
        for (const f of fs) evidenceFiles.add(f);
      }
      asked[runId] = (run.hunks || []).map((h) => ({
        file: h.file,
        // A hunk is asked for when its file, or the file it plainly mirrors by
        // basename, is in the evidence of a finding the run was handed.
        askedFor: [...evidenceFiles].some((e) => e === h.file || e.split('/').pop() === h.file.split('/').pop()),
      }));
      for (const h of run.hunks || []) {
        if (Object.keys(h).length !== 1 || !('file' in h)) {
          ok = reject(`${runId}: a hunk carries ${Object.keys(h).join(', ')}. A hunk records the file it touched; whether it should survive review is what the clip asks`);
        }
      }
    }

    const a1 = asked['run-3001'] || [];
    if (a1.length !== 2) {
      ok = reject(`run-3001 has ${a1.length} hunks; C5 reviews two, one that the finding asks for and one that it does not`);
    } else {
      if (!a1.some((h) => h.askedFor)) ok = reject('run-3001 has no hunk traceable to incident-2002, so step 2 has nothing to accept');
      const unasked = a1.filter((h) => !h.askedFor);
      if (unasked.length === 0) ok = reject('run-3001 has no hunk that the finding fails to ask for, so step 2 has nothing to reject and the review teaches nothing');
      else if (!unasked.some((h) => h.file === RUBRIC)) {
        ok = reject(`run-3001's unrequested hunk touches ${unasked.map((h) => h.file).join(', ')} rather than ${RUBRIC}. C5 is about an automation editing the standard it is judged by; any other file makes it an ordinary scope complaint`);
      }
    }
    const a2 = asked['run-3002'] || [];
    if (!a2.some((h) => h.askedFor)) {
      ok = reject('run-3002 has no hunk traceable to incident-2001, so C6 has no sound work to preserve and the recovery is just a revert');
    }
    if (!a2.some((h) => !h.askedFor)) {
      ok = reject('run-3002 has no hunk outside the finding, so there is nothing for C6 to isolate');
    }
    return ok;
  },

  'fixtures-carry-no-answer-key': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const FILES = [
      ['automation/github-seed/commits.json', 'commits',
        ['sha', 'message', 'author', 'committedAt', 'filesChanged'], (c) => c.sha],
      ['automation/sentry-fixtures/issues.json', 'issues',
        ['id', 'title', 'culprit', 'firstSeen', 'lastSeen', 'affectedUsers', 'occurrences',
          'release', 'stack', 'workaround', 'userImpact'], (i) => i.id],
      // A run records what it did, never whether it was right: the verdicts and
      // the correct/faultType pair were C5 step 2's and C6 step 2's findings,
      // and C6 step 1 printed the fault type on camera a minute before step 2
      // asked Codex to name it.
      ['automation/runs/run-3001.json', 'hunks', ['file'], (h) => h.file],
      ['automation/runs/run-3002.json', 'hunks', ['file'], (h) => h.file],
      ['automation/runs/run-3003.json', 'hunks', ['file'], (h) => h.file],
    ];
    let ok = true;
    for (const [file, key, allowed, idOf] of FILES) {
      const doc = JSON.parse(read(file));
      const records = doc[key] || [];
      for (const rec of records) {
        for (const k of Object.keys(rec)) {
          if (!allowed.includes(k)) {
            ok = reject(`${file}: ${idOf(rec)} carries a "${k}" field. The evidence fixtures hold facts about each record; a field that reasons about one hands the agent a finding a later step is supposed to reach. Allowed: ${allowed.join(', ')}`);
          }
        }
      }
      const c = doc.correlation;
      if (c) {
        for (const k of ['correct', 'faultType']) {
          if (k in c) {
            ok = reject(`${file}: correlation carries "${k}". A run that failed does not know the right answer -- that is what the recovery clip works out, and this field printed it on camera first`);
          }
        }
      }
      if (doc.validation && 'note' in doc.validation) {
        ok = reject(`${file}: validation carries a note explaining which hunk is at fault. The gate results are the evidence; the diagnosis is the clip`);
      }
      const comment = doc._comment || '';
      for (const rec of records) {
        const id = idOf(rec);
        if (comment.includes(id)) {
          ok = reject(`${file}: the file comment names ${id}. A comment may describe what the file is; naming a record means reasoning about it, and the agent reads this file`);
        }
      }
    }
    return ok;
  },

  /**
   * Every fixture stack frame opens on real code.
   *
   * The sentry fixture promised frames "cross-referenced against real code" and
   * mostly could not be: changeStatus was given as ticketService.ts:196 when it
   * starts at 244, the route frame pointed at a line that is not a handler, and
   * evt-1043 named a bulkImport function that does not exist anywhere in the
   * repository. An agent that takes the promise seriously reports the real
   * sites instead -- the measured walk cited :253 and :70, correcting the
   * fixture -- and then the runbook's Highlight, which is a stack frame, does
   * not match what is on screen.
   *
   * A frame must name a file that exists and a symbol that exists in it, at a
   * line that either contains the symbol or falls inside its definition. A frame
   * may carry '?' for the line: evt-1099 has none captured, and that absence is
   * the evidence for deferring it.
   */
  'fixture-stack-frames-resolve': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const doc = JSON.parse(read('automation/sentry-fixtures/issues.json'));
    let ok = true;
    for (const issue of doc.issues) {
      for (const frame of issue.stack || []) {
        const m = frame.match(/^at\s+([\w.$]+)\s+\(([^:]+):(\d+|\?)\)$/);
        if (!m) { ok = reject(`${issue.id}: frame "${frame}" is not "at <symbol> (<file>:<line|?>)"`); continue; }
        const [, symbol, file, lineSpec] = m;
        let src;
        try { src = read(file); } catch { ok = reject(`${issue.id}: frame "${frame}" names ${file}, which does not exist`); continue; }
        const lines = src.split('\n');
        // The last segment is what a stack frame shows for a method call.
        const leaf = symbol.split('.').pop();
        const declared = lines.findIndex((l) => new RegExp(`\\b(?:function|const|let|class)\\s+${leaf}\\b|\\b${leaf}\\s*[:(]`).test(l));
        if (declared < 0 && !src.includes(leaf)) {
          ok = reject(`${issue.id}: frame "${frame}" names ${symbol}, which does not appear in ${file}. bulkImport was such a frame -- an agent that opens it finds nothing`);
          continue;
        }
        if (lineSpec === '?') continue;
        const n = Number(lineSpec);
        if (n < 1 || n > lines.length) {
          ok = reject(`${issue.id}: frame "${frame}" points at line ${n}, but ${file} has ${lines.length} lines`);
          continue;
        }
        const onLine = lines[n - 1].includes(leaf);
        // Otherwise the line must fall inside the symbol's definition, taken as
        // running to the next top-level declaration.
        let inside = false;
        if (!onLine) {
          const start = lines.findIndex((l) => new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${leaf}\\b`).test(l));
          if (start >= 0) {
            let end = lines.length;
            for (let i = start + 1; i < lines.length; i += 1) {
              if (/^\}/.test(lines[i])) { end = i + 1; break; }
            }
            inside = n - 1 > start && n - 1 < end;
          }
        }
        if (!onLine && !inside) {
          ok = reject(`${issue.id}: frame "${frame}" points at ${file}:${n}, which neither mentions ${leaf} nor falls inside its definition. Open it and the frame lands somewhere unrelated`);
        }
      }
    }
    return ok;
  },

  'c6-step1-proves-its-files-exist': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const RUNBOOK = 'module1/m1-c6-migrate-one-express-route.md';
    const ARTIFACTS = [
      'supporthub-api/migration/routes/ticketRead.mts',
      'supporthub-api/migration/tests/contracts/ticket-read.route.test.mts',
    ];
    const s = read(RUNBOOK);
    const step1 = s.slice(s.indexOf('## Step 1 '), s.indexOf('## Step 2 '));
    if (!step1) return reject(`${RUNBOOK}: step 1 not found -- the runbook shape changed`);
    const i = step1.indexOf('**Verification');
    if (i < 0) return reject(`${RUNBOOK}: step 1 has no Verification block`);
    const m = step1.slice(i).match(/```bash\n([\s\S]*?)\n```/);
    if (!m) return reject(`${RUNBOOK}: step 1's verification has no command block`);
    const cmds = m[1];
    const missing = ARTIFACTS.filter((a) => !cmds.includes(a));
    if (missing.length) {
      return reject(`${RUNBOOK}: step 1's verification never names ${missing.join(' or ')} -- it can only report a scope breach, not a run that wrote nothing`);
    }
    const firstArtifact = Math.min(...ARTIFACTS.map((a) => cmds.indexOf(a)));
    const firstStatus = cmds.indexOf('git status');
    if (firstStatus >= 0 && firstStatus < firstArtifact) {
      return reject(`${RUNBOOK}: step 1's verification runs git status before it proves the two files exist -- the existence test has to be the first thing on screen, ahead of the reply`);
    }
    return true;
  },

  /**
   * Clip 6 migrates the route slice inside supporthub-api/migration, and leaves
   * supporthub-api/modern alone.
   *
   * This is not a style preference, it is where the repository's own migration
   * story lives: plans/migration-plan.md says the service migrates in place, the
   * compat layer the route depends on is migration/compat, and migration's
   * tsconfig and vitest config are the ones that pick the migrated files up.
   *
   * An earlier C6 prompt said the opposite -- "Migrate ONLY the GET /tickets/:id
   * route from supporthub-api/migration to the modern service in
   * supporthub-api/modern" -- and Codex obeyed it exactly, producing a route, a
   * contract test and an app.ts edit under modern/. Nothing was wrong with the
   * work; it was in the wrong service, and it dirtied the file clip 2 films and
   * whose closing proof is an empty Source Control view.
   *
   * Three separate things have to hold, so all three are asserted here rather
   * than trusting the prompt's opening sentence:
   *   1. the prompt creates its files under supporthub-api/migration/
   *   2. no supporthub-api/modern/ path appears in the prompt at all, except in
   *      the line that forbids writing there
   *   3. the runbook's own verification proves modern/ stayed untouched, so a run
   *      that drifts is caught on camera and not two clips later
   *
   * Proven red on each: a modern/ path put back into the prompt, the constraint
   * line deleted, and the verification's modern/ guard removed.
   */
  'c6-migrates-in-place': () => {
    const reject = (why) => { process.stderr.write(`  ${why}\n`); return false; };
    const RUNBOOK = 'module1/m1-c6-migrate-one-express-route.md';
    const SAVED = 'plans/prompts/m1-c6-migrate-route.md';
    const FORBID = 'Do not create or modify any file under supporthub-api/modern.';
    let ok = true;

    for (const f of [RUNBOOK, SAVED]) {
      // All of the clip's prompts, joined. Step 1 sends two -- state the
      // conversions, then apply them -- so the target path is in one and the
      // constraints are in the other, and reading only the block that opens on
      // the skill line would miss every constraint.
      const blocks = [...read(f).matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
      if (blocks.length === 0) { ok = reject(`${f}: no C6 prompt block found -- the shape changed`); continue; }
      const prompt = blocks.join('\n');

      if (!/supporthub-api\/migration\/routes\//.test(prompt)) {
        ok = reject(`${f}: the C6 prompt never names a file under supporthub-api/migration/routes/ -- it has to say where the migrated route lands`);
      }
      if (!prompt.includes(FORBID)) {
        ok = reject(`${f}: the C6 prompt is missing the constraint line "${FORBID}"`);
      }
      const strays = [...prompt.matchAll(/supporthub-api\/modern[A-Za-z0-9._/-]*/g)]
        .map((m) => m[0])
        .filter((path) => !FORBID.includes(path));
      if (strays.length) {
        ok = reject(`${f}: the C6 prompt points at ${[...new Set(strays)].join(', ')} -- clip 6 migrates in place and must not write into the modern workspace`);
      }
    }

    const rb = read(RUNBOOK);
    if (!/git status --porcelain supporthub-api\/modern/.test(rb)) {
      ok = reject(`${RUNBOOK}: step 1's verification never proves supporthub-api/modern stayed untouched -- add "git status --porcelain supporthub-api/modern | wc -l" and require 0`);
    }
    // No on-camera `git status --short` may narrow to a path. One fix scoped it
    // to supporthub-api/, which was quiet about a measured run that also rewrote
    // plans/migration-plan.md -- Step 4's job, done early, invisible. A filter
    // that removes noise by naming what to look at removes the signal with it.
    //
    // It briefly carried `-- ':!plans/prompts'` because the retired skill-on /
    // skill-off runs moved that directory aside and its deletions polluted the
    // count. Nothing moves it now, so the exclusion is vestigial and the bare
    // form is both correct and the widest.
    const camera = rb.slice(rb.indexOf('# ON-CAMERA'));
    for (const m of camera.matchAll(/^git status --short(.*)$/gm)) {
      const args = m[1].trim();
      if (args && !/^--\s*'?:!/.test(args)) {
        ok = reject(`${RUNBOOK}: on-camera \`git status --short ${args}\` narrows to a path -- it goes blind to everything outside it, which is how a run that also rewrote plans/migration-plan.md passed step 1. Leave it bare, or exclude with -- ':!<path>'`);
      }
    }
    return ok;
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
