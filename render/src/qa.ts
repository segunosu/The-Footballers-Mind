// 47-point QA checklist adapted for script-stage validation. Runs BEFORE any
// render is dispatched. Any failing item flags the session and blocks its
// render (in --live) or just warns (in --dry).

import type { SessionScript } from './types';

export type QaResult = { pass: boolean; code: string; message: string };

export function runQa(s: SessionScript): QaResult[] {
  const out: QaResult[] = [];

  // Duration guardrails
  const [lo, hi] = s.video.production_spec.duration_sec_target;
  if (s.video.estimated_duration_sec < lo)
    out.push({ pass: false, code: 'video.too_short', message: `Video est ${s.video.estimated_duration_sec}s < ${lo}s target` });
  if (s.video.estimated_duration_sec > hi)
    out.push({ pass: false, code: 'video.too_long', message: `Video est ${s.video.estimated_duration_sec}s > ${hi}s target` });

  // Caption lines exist
  if (!s.video.caption_lines.length)
    out.push({ pass: false, code: 'video.no_captions', message: 'No caption lines — hard-coded captions are required for all TPM videos' });

  // Voice script length (rough char count: ~150 wpm -> ~2.5 chars/sec)
  const voiceChars = s.voice.full_script.length;
  const estVoiceSec = voiceChars / 8; // narration rate ~7.5 chars/sec (UK English, calm pace)
  const [vlo, vhi] = s.voice.production_spec.duration_sec_target;
  if (estVoiceSec < vlo - 10 || estVoiceSec > vhi + 10)
    out.push({ pass: false, code: 'voice.length_off', message: `Voice est ${estVoiceSec.toFixed(0)}s vs target ${vlo}–${vhi}s` });

  // Remember line present
  if (!s.card.remember_line?.trim())
    out.push({ pass: false, code: 'card.no_remember_line', message: 'Session card missing remember line' });

  // Brand voice — reject patronising words
  const badWords = ['little champion', 'awesome awesome', 'super duper', 'kiddo'];
  const lowered = (s.video.caption_lines.join(' ') + ' ' + s.voice.full_script).toLowerCase();
  for (const w of badWords) {
    if (lowered.includes(w)) out.push({ pass: false, code: 'voice.patronising', message: `Contains "${w}" — violates brand voice` });
  }

  // Clinical language — reject in child-facing copy
  const clinical = ['anxiety disorder', 'depression', 'mental illness', 'therapy'];
  for (const w of clinical) {
    if (lowered.includes(w)) out.push({ pass: false, code: 'voice.clinical_language', message: `Contains clinical term "${w}"` });
  }

  // Age-band sanity — age_7_9 shouldn't exceed 10-minute target; age_10_12 12; age_13_14 15
  // (These are per-session TOTALS not per-video; advisory only.)

  // Needs-variant flag
  if (s.needs_variant)
    out.push({ pass: false, code: 'variant.not_written', message: 'Session is a copy awaiting per-age rewrite' });

  // If nothing flagged, emit a single pass row
  if (out.length === 0) {
    out.push({ pass: true, code: 'qa.all_pass', message: 'All checks pass' });
  }
  return out;
}

// CLI entry: `tsx src/qa.ts phase1`
if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] || 'phase1';
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const bundle = JSON.parse(
    await fs.readFile(path.resolve(process.cwd(), 'scripts', `${target}.json`), 'utf8'),
  );
  let failed = 0;
  for (const s of bundle.sessions) {
    const results = runQa(s);
    const fails = results.filter((r) => !r.pass);
    if (fails.length) {
      failed += fails.length;
      console.log(`[${s.session_key}] ${fails.length} issue(s):`);
      fails.forEach((f) => console.log(`  - ${f.code}: ${f.message}`));
    }
  }
  console.log(failed ? `\n${failed} QA issue(s) total` : '\nAll sessions pass QA.');
  process.exit(failed ? 1 : 0);
}
