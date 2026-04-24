# The Player's Mind — Operations Runbook

## 1. At a glance

**Product:** Personalised, psychotherapist-designed mental fitness curriculum delivered via three PWA apps (Player, Coach, Parent) to footballers aged 7–14, with automated safeguarding signal detection and escalation.

**Tech stack:** TypeScript, React, Supabase (PostgreSQL + RLS), HeyGen (video), ElevenLabs (voice), Vite, pnpm monorepo.

**Live URLs:**
- Player: http://localhost:5173 (dev) | https://player.theplayersmind.app (live — not yet deployed)
- Coach: http://localhost:5174 (dev) | https://coach.theplayersmind.app (live — not yet deployed)
- Parent: http://localhost:5175 (dev) | https://parent.theplayersmind.app (live — not yet deployed)

**Key people:** Segun (founder), [CTO/Tech Lead name], [Psychotherapist name], [Legal/Safeguarding partner name] — fill in during onboarding.

---

## 2. First-time setup (30 minutes)

### Prerequisites

```
Node 20+ (check: node --version)
pnpm 9+ (check: pnpm --version)
Supabase account (create at supabase.com if you don't have one)
Clone access to this monorepo
```

### Step-by-step

**Clone and install:**

```bash
git clone <repo-url>
cd tpm
pnpm install
```

**Get API keys from Supabase:**

1. Go to https://supabase.com and log in
2. Open the project `calarossa` (shared project; migrate before launch per Task #9)
3. Settings → API → Copy the **anon key** (public key, safe to commit to .env)
4. Copy the **service-role key** (secret; use only in render harness and server functions)

**Set up environment:**

```bash
cd tpm
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://kpsxdpxehorbjzgkkjqy.supabase.co
VITE_SUPABASE_ANON_KEY=<paste anon key from Supabase Studio>
```

**Run all three apps in parallel:**

```bash
pnpm dev
```

You should see:
```
Player → http://localhost:5173
Coach → http://localhost:5174
Parent → http://localhost:5175
```

**Sign in with demo credentials:**

- Coach email: `coach@demo.local` | Password: `demo123`
- Parent email: `parent@demo.local` | Password: `demo123`
- Player (optional): `player@demo.local` | Password: `demo123`

These users are seeded in `fixtures_dev.sql`. Expect:
- Coach app to show a "Squad" view with 3 players and a "Signals" tab (likely empty)
- Parent app to show a child "Morgan" in "My Child" and some published sessions
- Player app to load the week-1 session video (placeholder until HeyGen keys arrive)

### Common first-time errors

**Magic link not arriving:**
- Check email spam folder (Supabase sends from `noreply@...<project>.supabase.co`)
- Or use the demo credentials above instead

**CORS error when fetching:**
- Verify `VITE_SUPABASE_URL` matches the project URL exactly
- Supabase CORS is preconfigured for `localhost:*`

**RLS "Permission denied" on queries:**
- Check that your JWT is being sent (look at network tab in DevTools)
- Verify your user role in `tpm.user_roles` table (use Supabase Studio to inspect)
- Run the RLS tests (Section 4) to confirm policies are sound

---

## 3. Repo tour

### Structure

```
tpm/
├── apps/
│   ├── player/         # Player app: session videos + mood check-in
│   ├── coach/          # Coach app: squad view + signal alerts + facilitation guides
│   └── parent/         # Parent app: child progress + digest email prefs
├── packages/
│   ├── auth/           # Supabase auth helpers (magic link, session mgmt)
│   ├── design-system/  # Brand tokens, CSS variables, shared button/card components
│   ├── supabase/       # Typed Supabase client + helper functions (RLS checks)
│   └── config/         # Shared tsconfig, vite.config, eslint
├── render/             # Video render harness (HeyGen + ElevenLabs pipeline)
├── supabase/           # Schema, RLS policies, fixtures
│   ├── TPM-supabase-schema.sql    # Full schema (tables, enums, RLS, functions)
│   ├── rls_safeguarding_tests.sql # RLS boundary tests
│   └── fixtures_dev.sql           # Dev users + demo data
└── README.md, package.json, tsconfig.base.json
```

### What each package exports

- **@tpm/design-system**: `tokens.css` (colour, typography, spacing vars), React components (Button, Card, Modal)
- **@tpm/auth**: `createClient()`, `signInWithMagicLink()`, `useSession()` hook
- **@tpm/supabase**: `createClient()`, RLS helper functions (`isCoachOfPlayer()`, `isParentOfPlayer()`)
- **@tpm/config**: TypeScript / Vite / ESLint shared configs

### Brand tokens

Live in `packages/design-system/src/tokens.css`. All colours, sizes, fonts are CSS custom properties (e.g., `--color-primary`, `--spacing-unit`). Imported in every app's root layout.

### Auth client creation

Every app creates a Supabase client in its layout or root component:

```typescript
import { createClient } from '@tpm/supabase';
const supabase = createClient();
```

This client uses the anon key from `.env.local` and automatically:
- Sends the user's JWT in the `Authorization` header on every request
- The server uses that JWT's `sub` claim to enforce Row-Level Security policies

---

## 4. Daily workflows

### Run all apps

```bash
pnpm dev
```

Each app hot-reloads on file save. Stop with Ctrl+C.

### Run a single app

```bash
pnpm --filter @tpm/player dev
pnpm --filter @tpm/coach dev
pnpm --filter @tpm/parent dev
```

### Add a new session (content team)

1. Add a row to `tpm.sessions` (via Supabase Studio or script):

```sql
insert into tpm.sessions (phase_id, week_number, age_band, title, subtitle, duration_min, outcome_promise, status)
values (1, 13, 'age_10_12', 'Week 13: Resilience', 'Bouncing back from setbacks', 15, 'I know how to stay calm when things go wrong', 'draft');
```

2. Create a `tpm.session_assets` row linking video/voice files (once HeyGen renders):

```sql
insert into tpm.session_assets (session_id, asset_type, storage_path)
select id, 'video', 'tpm-videos/phase1/week-13-age_10_12.mp4'
from tpm.sessions where week_number = 13 and age_band = 'age_10_12';
```

3. Mark the session as `approved` or `published` to make it visible:

```sql
update tpm.sessions set status = 'published', reviewed_by = '<your-uuid>', reviewed_at = now()
where week_number = 13 and age_band = 'age_10_12';
```

### Render a new video

From `tpm/render`:

```bash
# 1. Build a plan (cost estimate, no API calls)
pnpm render:plan

# 2. QA and dry-run (simulates HeyGen/ElevenLabs, no charges)
pnpm render:dry

# 3. Real render (calls HeyGen, ElevenLabs, uploads to Storage, updates DB)
# Fill .env.local with HEYGEN_API_KEY, ELEVENLABS_API_KEY, SUPABASE_SERVICE_ROLE_KEY first
pnpm render:live
```

See `render/README.md` for cost estimates, QA checks, and input/output details.

### Run RLS tests

```bash
cd tpm
pnpm exec supabase db remote run supabase/rls_safeguarding_tests.sql
```

Every test must show `pass = true`. If any fail:
- **T1 fail:** Coach can read raw mood data — check `wellbeing_checkins_self_rw` policy
- **T2 fail:** Parent can read raw mood data — same policy issue
- **T3 fail:** Parent reads unrelated child — check `players_read` policy requires `is_parent_of_player()`
- **T4 fail:** Coach cannot read signals — check `signals_coach_read` policy + `is_coach_of_player()` function
- **T5 fail:** Parent can read signals — information leak; parents should have no signal access

See `supabase/rls_safeguarding_tests.sql` comments for details.

### Deploy to preview (not set up yet)

Placeholder: TPM apps are PWA-only. Vercel or similar CI/CD is not configured. Flag for next phase.

### Rotate API keys

**HeyGen / ElevenLabs:**
1. Log into each service's dashboard
2. Regenerate API key
3. Update `.env.local` in `tpm/render/`
4. Re-run `pnpm render:dry` to verify

**Supabase anon key:**
1. Supabase dashboard → Settings → API
2. Note the current key's ID, then click "Rotate key"
3. Copy the new key
4. Update `.env.local` in each app (`VITE_SUPABASE_ANON_KEY`)
5. Commit and redeploy

**Supabase service-role key:**
1. Same path as anon key
2. Update only in `tpm/render/.env.local` (never commit)

---

## 5. Data model cheatsheet

| Table | Purpose |
|-------|---------|
| `profiles` | Extends Supabase auth: display_name, avatar, age_band (for minors) |
| `user_roles` | Maps users to roles (super_admin, club_admin, coach, parent, player) + scoping (club, squad) |
| `clubs` | Football clubs; each has a welfare officer contact |
| `squads` | Teams within a club, each with a primary coach and age band |
| `players` | Children enrolled in a squad; links to parent(s) |
| `player_parents` | Junction: which parent(s) consent for which child |
| `sessions` | Curriculum content: 12 weeks × 3 age bands = 36 sessions in Phase 1 |
| `session_assets` | Video, voice, captions, PDFs for each session |
| `session_progress` | Child's playback progress (e.g., 45% through a session) |
| `wellbeing_checkins` | Raw mood data (calm/ready/heavy/buzzing) submitted by child after session |
| `wellbeing_signals` | Computed alerts (flag/nudge/good) shown to coaches |
| `consents` | Audit trail: which parent granted/revoked which consent type when |
| `audit_log` | All data mutations: who, what, when |

**Safeguarding boundaries:**
- Coaches see **only aggregated signals** (patterns), never raw mood check-ins
- Parents see their **own child only** (filtered by `player_parents` link) and never raw mood data
- Raw check-ins are visible only to the child (if they have own login) or super_admin
- All reads enforce RLS via the Supabase JWT's `sub` claim; policies check roles and relationships in the database

---

## 6. Content pipeline

### Phase 1 (weeks 1–12) — approved and ready to render

Scripts live in `tpm/render/scripts/phase1.json` (36 entries: 12 weeks × 3 age bands).

Each entry has:
- **Canonical source:** age_10_12 (written by psychotherapist)
- **Per-age variants:** age_7_9 and age_13_14 (rewritten for comprehension + age-appropriateness)
- **Ritual vs narration:** Each session has a structured "ritual" activity and supporting narration

To update a script:
1. Edit `phase1.json`
2. Run `pnpm render:dry` to QA the script (checks duration, brand voice, captions, etc.)
3. Commit and await psychotherapist sign-off
4. Run `pnpm render:live` when ready

### Phases 2–4 (weeks 13–48) — outlines only

Psychotherapist has authored 108 outline scripts (3 phases × 12 weeks × 3 age bands). Full scripts require per-age variant expansion and are pending review. See Task #10.

### Regenerate facilitation guides

When Phase 1 scripts change, coaches need updated facilitation-guides.json:

```bash
cd tpm/render
pnpm build:guides
```

This transforms `phase1.json` → `scripts/facilitation-guides-phase1.json` and uploads to `tpm/apps/coach/public/facilitation-guides.json`. Coach app fetches this on load.

---

## 7. Safeguarding operations

**Source of truth:** See `../legal-pack/05-safeguarding-incident-runbook.md` (draft, pending legal review).

**Three escalation tiers:**

1. **Nudge signals** (lower priority) — Coach sees blue-bordered alert; coach decides if follow-up needed
2. **Flag signals** (high priority) — Coach sees red-bordered alert; coach must check in within 48 hours; auto-copied to Club Welfare Officer
3. **Emergency escalation** (immediate risk) — Child discloses abuse/self-harm; coach calls Welfare Officer + Childline immediately

**Coach app signals view:**

Open Coach app → "Signals" tab. Each row shows:
- Child name + mood pattern (e.g., "Heavy × 2 weeks")
- Attendance trend (e.g., "1/4 sessions this week")
- Action buttons: "Checked in", "Needs support", "Emergency"

Coach taps "Needs support" to escalate to Welfare Officer.

**Data-subject access requests (SARs):**

Parent/child requests their data:
1. Email hello@theplayersmind.app with "Data Subject Access Request"
2. TPM super-admin logs in to `/admin/data` (not yet built; flag for Phase 2)
3. Export all `tpm.audit_log` + `tpm.wellbeing_*` rows for that child
4. Send within 30 days (UK GDPR Article 15)

---

## 8. Release checklist (pilot launch gate)

- [ ] `pnpm test` and RLS tests pass
- [ ] Legal pack reviewed + signed by external lawyer
- [ ] Psychotherapist has signed off Phase 1 scripts (per `../legal-pack/04-content-approval.md`)
- [ ] One end-to-end HeyGen render completed (week 1, age 10–12) without errors
- [ ] Migrated TPM schema from `calarossa` to dedicated Supabase project (Task #9)
- [ ] Registered office address published + DPO appointed + external safeguarding partner (e.g., Professionals in Child Safeguarding) contracted
- [ ] App Store / Play Store dev accounts decision made (currently PWA-only; native apps not required for pilot)
- [ ] At least one real pilot club signed (DPA executed)
- [ ] Welfare Officer briefing email drafted + sent to each pilot club
- [ ] Emergency contact numbers populated in incident runbook (Table, Section 10)

---

## 9. Known gaps + tech debt

| Item | Impact | Owner |
|------|--------|-------|
| Player Join flow stubbed | Players cannot redeem parent invites themselves (parents can enrol them) | See `apps/player/src/pages/Join.tsx` comment "v1:" |
| TPM on `calarossa` project | Must migrate to own Supabase project before launch (Task #9) | Segun |
| No CI/CD pipeline | Manual deployment; no automated tests in merge gate | Phase 2 |
| No error tracking | Silent failures; no Sentry/DataDog integration | Phase 2 |
| PWA-only | iOS App Store / Android Play Store not set up; distribution via web link only | Decision pending |
| No player video analytics | Don't know which sessions kids drop out of (only completion %) | Phase 2 |
| Placeholder media | Session card images are placeholders until HeyGen/ElevenLabs keys arrive | Blocking render |
| `/admin/data` not built | Can't issue SARs via UI; manual DB export only | Phase 2 |

---

## 10. Glossary

| Term | Definition |
|------|-----------|
| **RLS** | Row-Level Security — PostgreSQL feature that filters data based on the authenticated user's JWT claims |
| **KCSIE** | Keeping Children Safe in Education 2024 — UK statutory safeguarding guidance for schools + youth organisations |
| **AADC** | Age Appropriate Design Code — ICO guidance on protecting children's privacy online |
| **DPA** | Data Processing Agreement — contract between TPM (data controller) and club (processor) |
| **DPIA** | Data Protection Impact Assessment — risk assessment required when processing children's data |
| **SAR** | Subject Access Request — child/parent right to request their personal data (UK GDPR Article 15) |
| **CWO** | Club Welfare Officer — designated safeguarding lead at the club; receives TPM escalations |
| **FA** | Football Association — UK body; grassroots safeguarding standards apply to affiliated clubs |
| **TOMs** | Theory of Change Models — logic maps showing how TPM's interventions lead to outcomes (used in impact evaluation) |

---

## Notes

- All file paths in this doc are workspace-relative (e.g., `tpm/apps/player`), not absolute.
- Every SQL migration should be in `supabase/` and applied via `pnpm exec supabase db push` or the Supabase MCP `apply_migration` tool.
- Commit `.env.local` templates only (`.env.example`); never commit real API keys.
- All changes to `tpm.sessions`, `tpm.profiles`, or `tpm.user_roles` should be logged in `tpm.audit_log` for compliance.
- Safeguarding is a permanent feature, not a bolt-on. Review policies quarterly and after every incident.

---

**Last updated:** 23 April 2026  
**Next review:** 30 May 2026 (post-first render)
