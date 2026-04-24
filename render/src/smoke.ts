// First-render sanity script — render ONE session end-to-end to prove the
// pipeline works before spending £454 on the full Phase 1 batch.
//
// Cost ceiling: ~£12 (one HeyGen render) + ~£0.60 (one ElevenLabs track).
//
// Usage:
//   cd tpm/render
//   cp .env.example .env.local   # fill all five keys
//   pnpm tsx src/smoke.ts week-01-age_10_12
//
// What it does (in order):
//   1. Warm-up check — calls the cheapest HeyGen + ElevenLabs endpoints to
//      validate the keys BEFORE any paid render is dispatched.
//   2. Loads the named session from scripts/phase1.json.
//   3. Runs the script-stage QA on it — aborts if QA fails.
//   4. Fires HeyGen video render (test mode off for a real render).
//   5. Fires ElevenLabs voice synth.
//   6. Uploads both to Supabase Storage (tpm-videos / tpm-voice).
//   7. Upserts tpm.session_assets rows for (session_id, asset_type).
//   8. Prints a short report — paths + signed URLs you can paste into a
//      browser to verify.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, assertLiveReady } from './config';
import { runQa } from './qa';
import { submitHeyGenRender, pollHeyGenStatus } from './heygen';
import { synthesiseVoice } from './elevenlabs';
import { createServiceClient, uploadAsset, recordSessionAsset } from './storage';
import type { ScriptBundle } from './types';

async function warmUpHeyGen(apiKey: string): Promise<void> {
  // Cheapest HeyGen endpoint: list avatars. 200 OK = key works.
  const res = await fetch('https://api.heygen.com/v2/avatars', {
    headers: { 'X-Api-Key': apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HeyGen key validation failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

async function warmUpElevenLabs(apiKey: string): Promise<void> {
  // Cheapest ElevenLabs endpoint: GET /user.
  const res = await fetch('https://api.elevenlabs.io/v1/user', {
    headers: { 'xi-api-key': apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs key validation failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

async function loadBundle(): Promise<ScriptBundle> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.resolve(here, '..', 'scripts', 'phase1.json');
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw) as ScriptBundle;
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    console.error('usage: pnpm tsx src/smoke.ts <session_key>');
    console.error('example: pnpm tsx src/smoke.ts week-01-age_10_12');
    process.exit(2);
  }

  const cfg = loadConfig('live');
  const missing = assertLiveReady(cfg);
  if (missing.length) {
    console.error(`--live requires env: ${missing.join(', ')}. Aborting.`);
    process.exit(2);
  }

  console.log('[smoke] 1/7 warming up HeyGen key…');
  await warmUpHeyGen(cfg.heygen.key!);
  console.log('[smoke] 2/7 warming up ElevenLabs key…');
  await warmUpElevenLabs(cfg.elevenlabs.key!);
  console.log('[smoke] 3/7 loading bundle…');
  const bundle = await loadBundle();
  const session = bundle.sessions.find((s) => s.session_key === arg);
  if (!session) {
    console.error(`session_key "${arg}" not found in bundle. Available sample: ${bundle.sessions.slice(0, 3).map((s) => s.session_key).join(', ')}…`);
    process.exit(2);
  }
  console.log(`[smoke]   found: ${session.session_key} — "${session.title}"`);

  console.log('[smoke] 4/7 running QA on the script…');
  const qa = runQa(session).filter((r) => !r.pass);
  if (qa.length) {
    console.error('[smoke]   QA failed:');
    qa.forEach((r) => console.error(`    - ${r.code}: ${r.message}`));
    console.error('[smoke]   Aborting without spending money.');
    process.exit(3);
  }
  console.log('[smoke]   QA clean');

  const client = createServiceClient(cfg);

  console.log('[smoke] 5/7 submitting HeyGen render (this takes ~10 min)…');
  const submitted = await submitHeyGenRender(cfg, session);
  let job = submitted;
  const startedAt = Date.now();
  const maxMs = 20 * 60 * 1000; // 20 min ceiling
  while (job.status === 'processing') {
    if (Date.now() - startedAt > maxMs) {
      throw new Error(`HeyGen render timed out after ${maxMs / 1000}s — job ${job.video_id}`);
    }
    await new Promise((r) => setTimeout(r, 15_000));
    job = await pollHeyGenStatus(cfg, submitted.video_id);
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  if (job.status !== 'completed' || !job.video_url) {
    throw new Error(`HeyGen render failed: ${job.status}`);
  }
  console.log('[smoke]   HeyGen render complete');

  const videoBuf = await fetch(job.video_url).then((r) => r.arrayBuffer());
  const videoPath = `phase1/${session.session_key}.mp4`;
  console.log(`[smoke] 6/7 uploading video → tpm-videos/${videoPath}`);
  await uploadAsset(client, 'tpm-videos', videoPath, videoBuf, 'video/mp4');

  console.log('[smoke]   synthesising ElevenLabs voice…');
  const voiceBuf = await synthesiseVoice(cfg, session.voice.full_script);
  const voicePath = `phase1/${session.session_key}.mp3`;
  console.log(`[smoke]   uploading voice → tpm-voice/${voicePath}`);
  await uploadAsset(client, 'tpm-voice', voicePath, voiceBuf, 'audio/mpeg');

  console.log('[smoke] 7/7 linking assets in tpm.session_assets…');
  const { data: sessionRow, error: sqlErr } = await client
    .schema('tpm')
    .from('sessions')
    .select('id')
    .eq('week_number', session.week_number)
    .eq('age_band', session.age_band)
    .single();
  if (sqlErr || !sessionRow?.id) {
    throw new Error(`session row lookup failed — did the migration seed weeks 1–3? (${sqlErr?.message ?? 'not found'})`);
  }
  await recordSessionAsset(client, sessionRow.id, 'video', videoPath);
  await recordSessionAsset(client, sessionRow.id, 'voice', voicePath);

  // Produce signed URLs so the user can eyeball them immediately
  const [{ data: v }, { data: a }] = await Promise.all([
    client.storage.from('tpm-videos').createSignedUrl(videoPath, 3600),
    client.storage.from('tpm-voice').createSignedUrl(voicePath, 3600),
  ]);

  console.log('\n--- SMOKE TEST PASSED ---');
  console.log(`session_key:   ${session.session_key}`);
  console.log(`video:         ${videoPath}`);
  console.log(`voice:         ${voicePath}`);
  console.log(`\nPaste into a browser (URLs valid for 1 hour):`);
  console.log(`  video: ${v?.signedUrl ?? '(sign failed)'}`);
  console.log(`  voice: ${a?.signedUrl ?? '(sign failed)'}`);
  console.log('\nNow open the Player app, sign in as parent.morganjones@example.com,');
  console.log(`and the week-${session.week_number} session should render actual video instead of "coming soon".`);
}

main().catch((err) => {
  console.error('\n[smoke] FAILED:', err.message);
  process.exit(1);
});
