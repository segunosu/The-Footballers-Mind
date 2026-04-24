# TPM video render harness

Turns Phase 1 scripts into 36 rendered sessions (weeks 1–12 × 3 age bands),
uploaded to Supabase Storage and linked to `tpm.session_assets`.

## Modes

| Mode       | What it does                                                         | Needs API keys |
|------------|----------------------------------------------------------------------|----------------|
| `plan`     | Builds a render plan and cost estimate. No network calls.            | No             |
| `dry`      | Plan + QA + simulates renders. No HeyGen / ElevenLabs calls.         | No             |
| `live`     | Full pipeline — calls HeyGen, ElevenLabs, uploads, updates DB.       | Yes            |

## Quick start

```bash
cd tpm
pnpm install
cd render
cp .env.example .env.local
# no keys needed for plan / dry
pnpm render:plan
```

When you're ready to render for real:

```bash
# Fill .env.local with HEYGEN_*, ELEVENLABS_*, SUPABASE_SERVICE_ROLE_KEY
pnpm render:live
```

## Inputs

- `scripts/phase1.json` — structured Phase 1 scripts extracted from
  `THEAA-content-scripts.pdf` (36 entries — 12 sessions × 3 age bands; the
  age_10_12 rows carry the canonical source text, the 7–9 and 13–14 rows are
  flagged `needs_variant: true` until per-age rewrites are authored).

## Outputs

- `reports/phase1-<mode>-<timestamp>.json` — the full plan + totals + QA flags.
- In `live` mode, MP4 / MP3 files land in Supabase Storage:
  - `tpm-videos/phase1/week-03-age_10_12.mp4`
  - `tpm-voice/phase1/week-03-age_10_12.mp3`
- `tpm.session_assets` rows are upserted to link each file to its session.

## QA

Every session runs `src/qa.ts` before render. Failing QA blocks a render in
live mode. The checks are a subset of the 47-point QA framework tuned for
script-stage validation:

- video duration within 90–120s target
- voice script length within 58–62s target
- hard-coded captions present (non-negotiable for TPM)
- remember line present on the session card
- brand voice: no patronising language ("little champion", "kiddo", etc.)
- no clinical language in child-facing copy
- `needs_variant: false` (age-specific rewrite exists)

Run QA standalone with `pnpm qa:phase1`.

## Costs at a glance

Avatar IV @ ~£12/render × 36 = **£432**
ElevenLabs @ ~£0.60/track × 36 = **£22**
Total for Phase 1 first render: **£454** (conservative upper bound; the
business-plan estimate of £10–£18/session matches this).

Phases 2–4 add a further 108 sessions → estimated £1,350–£1,950 additional
to reach full curriculum render.

## Guardrails

- Test mode is enabled by default for HeyGen until `--live` is passed. This
  prevents accidental paid renders while iterating.
- The service-role Supabase key is required only for `--live`; plan and dry
  runs can use a read-only key or none.
- Renders are upserted by `(session_id, asset_type)`, so re-running doesn't
  duplicate assets.
