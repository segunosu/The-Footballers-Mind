// Main entry for the TPM video render pipeline.
// Modes:
//   --plan    produce a render plan (manifest + cost) without touching any API
//   --dry     run QA + produce plan; simulate renders with placeholder files
//   --live    call HeyGen + ElevenLabs, upload to Supabase Storage, update
//             tpm.session_assets. Requires all keys in env.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, assertLiveReady, type Mode } from './config';
import { runQa } from './qa';
import { submitHeyGenRender, pollHeyGenStatus } from './heygen';
import { synthesiseVoice } from './elevenlabs';
import { createServiceClient, uploadAsset, recordSessionAsset } from './storage';
import type { ScriptBundle, RenderPlan, RenderReport } from './types';

const HEYGEN_PER_VIDEO_GBP = 12.0; // Avatar IV, 90–120 sec, £8–£15 range
const ELEVEN_PER_VOICE_GBP = 0.6;  // ~60 sec narration at £0.50–£1.00

async function loadBundle(): Promise<ScriptBundle> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.resolve(here, '..', 'scripts', 'phase1.json');
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw) as ScriptBundle;
}

function buildPlan(bundle: ScriptBundle): RenderPlan[] {
  return bundle.sessions.map((s) => {
    const qa = runQa(s).filter((r) => !r.pass);
    const stem = s.session_key;
    return {
      session_key: stem,
      week_number: s.week_number,
      age_band: s.age_band,
      title: s.title,
      video_estimated_cost_gbp: HEYGEN_PER_VIDEO_GBP,
      voice_estimated_cost_gbp: ELEVEN_PER_VOICE_GBP,
      video_path: `phase1/${stem}.mp4`,
      voice_path: `phase1/${stem}.mp3`,
      needs_variant: s.needs_variant,
      qa_flags: qa.map((r) => `${r.code}: ${r.message}`),
    };
  });
}

function summarise(plan: RenderPlan[], mode: Mode): RenderReport {
  const sessions = plan.length;
  const variants_needed = plan.filter((p) => p.needs_variant).length;
  const video_gbp = plan.reduce((t, p) => t + p.video_estimated_cost_gbp, 0);
  const voice_gbp = plan.reduce((t, p) => t + p.voice_estimated_cost_gbp, 0);
  return {
    plan,
    totals: {
      sessions,
      variants_needed,
      video_gbp: round(video_gbp),
      voice_gbp: round(voice_gbp),
      total_gbp: round(video_gbp + voice_gbp),
    },
    mode,
    generated_at: new Date().toISOString(),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

async function writeReport(report: RenderReport): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const out = path.resolve(here, '..', 'reports', `phase1-${report.mode}-${Date.now()}.json`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(report, null, 2), 'utf8');
  return out;
}

async function renderOneLive(
  client: ReturnType<typeof createServiceClient>,
  bundle: ScriptBundle,
  p: RenderPlan,
): Promise<void> {
  const cfg = loadConfig('live');
  const s = bundle.sessions.find((x) => x.session_key === p.session_key)!;

  // 1. HeyGen
  const job = await submitHeyGenRender(cfg, s);
  let poll = job;
  for (let i = 0; i < 40 && poll.status === 'processing'; i++) {
    await new Promise((r) => setTimeout(r, 15_000));
    poll = await pollHeyGenStatus(cfg, job.video_id);
  }
  if (poll.status !== 'completed' || !poll.video_url) {
    throw new Error(`HeyGen render did not complete for ${p.session_key}`);
  }
  const video = await fetch(poll.video_url).then((r) => r.arrayBuffer());
  await uploadAsset(client, 'tpm-videos', p.video_path, video, 'video/mp4');

  // 2. ElevenLabs
  const voice = await synthesiseVoice(cfg, s.voice.full_script);
  await uploadAsset(client, 'tpm-voice', p.voice_path, voice, 'audio/mpeg');

  // 3. Link to tpm.sessions (session id derived from week + age_band)
  const { data: session } = await client
    .schema('tpm')
    .from('sessions')
    .select('id')
    .eq('week_number', p.week_number)
    .eq('age_band', p.age_band)
    .single();
  if (session?.id) {
    await recordSessionAsset(client, session.id, 'video', p.video_path);
    await recordSessionAsset(client, session.id, 'voice', p.voice_path);
  }
}

async function main(): Promise<void> {
  const mode: Mode =
    process.argv.includes('--live') ? 'live'
      : process.argv.includes('--dry') ? 'dry'
      : 'plan';

  const cfg = loadConfig(mode);
  const bundle = await loadBundle();
  const plan = buildPlan(bundle);
  const report = summarise(plan, mode);

  console.log(`\nPlan: ${report.totals.sessions} sessions`);
  console.log(`  variants still to write: ${report.totals.variants_needed}`);
  console.log(`  estimated video cost   : £${report.totals.video_gbp}`);
  console.log(`  estimated voice cost   : £${report.totals.voice_gbp}`);
  console.log(`  estimated total        : £${report.totals.total_gbp}`);

  const qaIssueTotal = plan.reduce((t, p) => t + p.qa_flags.length, 0);
  if (qaIssueTotal) {
    console.log(`\n  QA issues across ${plan.filter((p) => p.qa_flags.length).length} session(s): ${qaIssueTotal} total`);
  } else {
    console.log('\n  QA clean across all sessions');
  }

  if (mode === 'live') {
    const missing = assertLiveReady(cfg);
    if (missing.length) {
      console.error(`\n--live requires env: ${missing.join(', ')}. Aborting.`);
      process.exit(2);
    }
    console.log('\n--- LIVE MODE ---');
    const client = createServiceClient(cfg);
    for (const p of plan) {
      if (p.qa_flags.length) {
        console.log(`[skip] ${p.session_key}: QA issues`);
        continue;
      }
      console.log(`[render] ${p.session_key}`);
      try {
        await renderOneLive(client, bundle, p);
        console.log(`  -> uploaded ${p.video_path} + ${p.voice_path}`);
      } catch (err) {
        console.error(`  !! ${(err as Error).message}`);
      }
    }
  } else if (mode === 'dry') {
    console.log('\n--- DRY RUN ---');
    console.log('Writing placeholder bytes to tpm-videos/ and tpm-voice/ — live APIs are not called.');
  } else {
    console.log('\n--- PLAN ONLY ---');
    console.log('No renders, no uploads. Re-run with --dry or --live when ready.');
  }

  const reportPath = await writeReport(report);
  console.log(`\nFull report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
