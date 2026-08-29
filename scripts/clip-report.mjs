#!/usr/bin/env node
/**
 * Rewrite a clip's preflight transcript as a narration-ready report.
 *
 * The raw transcript is a flat list of checks in the order they ran, which is
 * the right shape for debugging and the wrong shape for writing narration. An
 * author sitting down to script clip 3 wants the clip's four steps and whether
 * each one is clear -- not forty checks, most of which are shared with three
 * other clips.
 *
 * So this reads the RESULT lines the preflight already wrote, groups them by
 * step using docs/preflight-step-map.json, takes the step titles from the
 * approved outline, and replaces the file with a short report. Failures keep
 * their why/fix/prompt; passes collapse to a count, because a passing check has
 * nothing to say.
 *
 *   node scripts/clip-report.mjs <clip> <transcript>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [clip, file] = process.argv.slice(2);
if (!clip || !file) { process.stderr.write('usage: clip-report.mjs <clip> <transcript>\n'); process.exit(2); }

const outline = JSON.parse(readFileSync('docs/outline-clip-map.json', 'utf8'));
const stepMap = JSON.parse(readFileSync('docs/preflight-step-map.json', 'utf8'));
const meta = outline.clips[clip] || {};
const steps = meta.bullets || [];
const gates = stepMap[clip] || {};

// Parse the transcript the preflight just wrote.
const lines = readFileSync(file, 'utf8').split('\n');
const results = [];
for (let i = 0; i < lines.length; i += 1) {
  const m = lines[i].match(/^RESULT (PASS|FAIL)\s+\[([a-z0-9]+)\]\s+(.*)$/);
  if (!m) continue;
  const entry = { state: m[1], scope: m[2], name: m[3], why: '', fix: '', prompt: '' };
  for (let j = i + 1; j < i + 5 && j < lines.length; j += 1) {
    const w = lines[j].match(/^WHY IT MATTERS\s+(.*)$/); if (w) entry.why = w[1];
    const f = lines[j].match(/^HOW TO FIX\s+(.*)$/); if (f) entry.fix = f[1];
    const p = lines[j].match(/^CODEX PROMPT\s+(.*)$/); if (p) entry.prompt = p[1];
  }
  results.push(entry);
}

const byName = Object.fromEntries(results.map((r) => [r.name, r]));
const shared = results.filter((r) => r.scope === 'all');
const failed = results.filter((r) => r.state === 'FAIL');

const out = [];
const rule = (n) => '-'.repeat(n);
out.push(`${clip.toUpperCase()} PREFLIGHT`, rule(clip.length + 10), '');
out.push(meta.title || clip, '');
out.push(`RUNBOOK      ${meta.runbook || 'unknown'}`);
out.push(`OBJECTIVES   ${(meta.objectives || []).join(', ')}`);
out.push(`READINESS    ${failed.length === 0 ? 'READY' : `NOT READY - ${failed.length} of ${results.length} checks failed`}`);
out.push('');

// ---- the four steps, which is what the file exists for
out.push('STEPS', rule(5), '');
steps.forEach((title, i) => {
  const n = i + 1;
  const own = Object.entries(gates)
    .filter(([, ss]) => ss.includes(n))
    .map(([name]) => byName[name])
    .filter(Boolean);
  const bad = own.filter((r) => r.state === 'FAIL');
  const sharedBad = shared.filter((r) => r.state === 'FAIL');
  const state = bad.length || sharedBad.length ? 'BLOCKED' : 'READY';
  out.push(`Step ${n}  ${state}`);
  out.push(`  ${title}`);
  if (own.length) {
    out.push(`  gated by ${own.length} check(s): ${own.filter((r) => r.state === 'PASS').length} pass, ${bad.length} fail`);
  } else {
    out.push('  gated only by the checks shared across this module');
  }
  for (const r of bad) out.push(`    FAIL  ${r.name}`);
  out.push('');
});

out.push(`SHARED GATES  ${shared.filter((r) => r.state === 'PASS').length} of ${shared.length} pass`, '');
out.push('  These gate every step above. A failure here blocks the whole clip.');
for (const r of shared.filter((x) => x.state === 'FAIL')) out.push(`    FAIL  ${r.name}`);
out.push('');

if (failed.length) {
  out.push('WHAT TO FIX', rule(11), '');
  for (const r of failed) {
    out.push(`${r.name}   [${r.scope}]`);
    if (r.why) out.push(`  why  ${r.why}`);
    if (r.fix) out.push(`  fix  ${r.fix}`);
    if (r.prompt) out.push(`  ask  ${r.prompt}`);
    out.push('');
  }
} else {
  out.push('Every gate is green. This clip can be recorded.', '');
}

out.push(`Full command output for this run: ${file.replace(/\.txt$/, '.full.txt')}`, '');
writeFileSync(file.replace(/\.txt$/, '.full.txt'), readFileSync(file, 'utf8'));
writeFileSync(file, out.join('\n'));
