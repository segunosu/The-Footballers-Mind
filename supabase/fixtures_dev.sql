-- =============================================================================
-- The Player's Mind (TPM) — Development Fixtures
-- =============================================================================
-- PURPOSE: Seed realistic test data for development and testing.
--
-- USAGE:
--   1. Via Supabase SQL Editor:
--      - Copy entire file
--      - Paste into SQL editor
--      - Set search_path to 'tpm' at the top
--      - Click "Run"
--
--   2. Via CLI (after supabase link):
--      supabase db push
--
-- IMPORTANT: This file is IDEMPOTENT — all inserts use 'ON CONFLICT DO NOTHING'
--            or 'WHERE NOT EXISTS' guards. Running it multiple times is safe.
--
-- TO UNDO:
--   1. Delete consents for the test parent
--   2. Delete session progress for Morgan J., Aisha K., Jude P.
--   3. Delete wellbeing check-ins and signals for the players
--   4. Delete user_roles for the test users
--   5. Delete profiles for the test users
--   6. Auth users must be deleted via Supabase Dashboard or Management API
--
-- FALLBACK NOTE: auth.users insertion from SQL is not directly supported in
--   Supabase. Use supabase-js or Supabase Management API instead (see below).
-- =============================================================================

-- REQUIREMENT: auth.users cannot be directly inserted via SQL due to Supabase RLS.
-- If you need to create test auth users, use one of these approaches:
--
-- OPTION A: Supabase Dashboard
--   1. Go to Authentication > Users
--   2. Click "Add user"
--   3. Email: admin.demo@unityfcacademy.co.uk, Password: [generate]
--   4. Repeat for coach.morris@unityfcacademy.co.uk, parent.morganjones@example.com
--
-- OPTION B: Supabase Management API (run from terminal)
--   curl --request POST \
--     --url https://kpsxdpxehorbjzgkkjqy.supabase.co/auth/v1/admin/users \
--     --header "apikey: YOUR_ANON_KEY" \
--     --header "authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
--     --header "content-type: application/json" \
--     --data '{
--       "email": "admin.demo@unityfcacademy.co.uk",
--       "password": "TempPassword123!",
--       "email_confirm": true,
--       "user_metadata": { "role": "club_admin" }
--     }'
--
-- OPTION C: supabase-js / Node.js script
--   const { createClient } = require('@supabase/supabase-js');
--   const client = createClient(URL, SERVICE_ROLE_KEY);
--   await client.auth.admin.createUser({
--     email: "admin.demo@unityfcacademy.co.uk",
--     password: "TempPassword123!",
--     email_confirm: true,
--     user_metadata: { role: "club_admin" }
--   });
--
-- After creating auth.users, the SQL below will seed tpm.profiles and roles.
-- =============================================================================

set search_path = tpm, public;

-- Hard-coded UUIDs for test users (must match auth.users IDs from step above)
-- If you create users with different IDs, update these constants:
\set ADMIN_ID '550e8400-e29b-41d4-a716-446655440001'::uuid
\set COACH_ID '550e8400-e29b-41d4-a716-446655440002'::uuid
\set PARENT_ID '550e8400-e29b-41d4-a716-446655440003'::uuid

-- Query IDs for existing club and squad (created in initial seed)
\set UNITY_FC_ID (select id from tpm.clubs where slug = 'unity-fc-academy' limit 1)
\set U10_REDS_ID (select id from tpm.squads where name = 'U10 Reds' limit 1)
\set MORGAN_ID (select id from tpm.players where first_name = 'Morgan' and last_initial = 'J' limit 1)
\set AISHA_ID (select id from tpm.players where first_name = 'Aisha' and last_initial = 'K' limit 1)
\set JUDE_ID (select id from tpm.players where first_name = 'Jude' and last_initial = 'P' limit 1)

-- =============================================================================
-- 1. PROFILES for test users (after auth.users are created)
-- =============================================================================

insert into tpm.profiles (
  id,
  display_name,
  email,
  phone,
  locale,
  is_minor,
  date_of_birth,
  created_at,
  updated_at
) values
  -- Admin user
  (:ADMIN_ID::uuid,
   'Alex Davies',
   'admin.demo@unityfcacademy.co.uk'::citext,
   '+44 20 7946 0958',
   'en-GB',
   false,
   '1985-03-22'::date,
   now(),
   now()),
  -- Coach user
  (:COACH_ID::uuid,
   'Morris Chen',
   'coach.morris@unityfcacademy.co.uk'::citext,
   '+44 121 555 0192',
   'en-GB',
   false,
   '1992-07-15'::date,
   now(),
   now()),
  -- Parent user
  (:PARENT_ID::uuid,
   'James Morgan',
   'parent.morganjones@example.com'::citext,
   '+44 113 555 0147',
   'en-GB',
   false,
   '1978-11-30'::date,
   now(),
   now())
on conflict (id) do nothing;

-- =============================================================================
-- 2. USER ROLES
-- =============================================================================

insert into tpm.user_roles (
  user_id,
  role,
  club_id,
  squad_id,
  created_at,
  created_by
) values
  -- Admin is club_admin of Unity FC
  (:ADMIN_ID::uuid,
   'club_admin'::tpm.user_role,
   :UNITY_FC_ID,
   null,
   now(),
   null),
  -- Coach is coach of U10 Reds
  (:COACH_ID::uuid,
   'coach'::tpm.user_role,
   :UNITY_FC_ID,
   :U10_REDS_ID,
   now(),
   null),
  -- Parent is parent at Unity FC
  (:PARENT_ID::uuid,
   'parent'::tpm.user_role,
   :UNITY_FC_ID,
   null,
   now(),
   null)
on conflict (user_id, role, club_id, squad_id) do nothing;

-- =============================================================================
-- 3. PARENT-CHILD LINK (James Morgan is parent of Morgan J.)
-- =============================================================================

insert into tpm.player_parents (
  player_id,
  parent_user_id,
  relationship,
  is_primary_consenter,
  created_at
) values
  (:MORGAN_ID,
   :PARENT_ID::uuid,
   'Father',
   true,
   now())
on conflict (player_id, parent_user_id) do nothing;

-- =============================================================================
-- 4. CONSENTS (Morgan J. — parent granted all except research_data)
-- =============================================================================

insert into tpm.consents (
  player_id,
  parent_user_id,
  consent_type,
  granted,
  document_version,
  granted_at,
  revoked_at,
  ip_address,
  user_agent
) values
  -- app_use: granted
  (:MORGAN_ID,
   :PARENT_ID::uuid,
   'app_use'::tpm.consent_type,
   true,
   1,
   now() - interval '7 days',
   null,
   '192.168.1.50'::inet,
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'),
  -- coach_patterns: granted
  (:MORGAN_ID,
   :PARENT_ID::uuid,
   'coach_patterns'::tpm.consent_type,
   true,
   1,
   now() - interval '7 days',
   null,
   '192.168.1.50'::inet,
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'),
  -- digest_email: granted
  (:MORGAN_ID,
   :PARENT_ID::uuid,
   'digest_email'::tpm.consent_type,
   true,
   1,
   now() - interval '7 days',
   null,
   '192.168.1.50'::inet,
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'),
  -- research_data: NOT granted
  (:MORGAN_ID,
   :PARENT_ID::uuid,
   'research_data'::tpm.consent_type,
   false,
   1,
   now() - interval '7 days',
   null,
   '192.168.1.50'::inet,
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0')
on conflict do nothing;

-- =============================================================================
-- 5. SESSIONS (Phase 1, weeks 1-3, all age bands)
--    Week 1: "Kickstart", Week 2: "Two seconds to reset", Week 3: "Breathing space"
-- =============================================================================

-- Week 1, age_7_9
insert into tpm.sessions (
  phase_id,
  week_number,
  age_band,
  title,
  subtitle,
  duration_min,
  outcome_promise,
  evidence_refs,
  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
) values
  (1, 1, 'age_7_9'::tpm.age_band,
   'Kickstart',
   'Get to know yourself as a player',
   10,
   'Identify one strength you bring to your team',
   '["AADC-1.1", "ICSE-2.2"]'::jsonb,
   'published'::tpm.content_status,
   null, null, now(), now())
on conflict (week_number, age_band) do nothing;

-- Week 1, age_10_12
insert into tpm.sessions (
  phase_id,
  week_number,
  age_band,
  title,
  subtitle,
  duration_min,
  outcome_promise,
  evidence_refs,
  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
) values
  (1, 1, 'age_10_12'::tpm.age_band,
   'Kickstart',
   'Discover your athletic identity',
   12,
   'Reflect on three qualities that make you a good footballer',
   '["AADC-1.1", "ICSE-2.2"]'::jsonb,
   'published'::tpm.content_status,
   null, null, now(), now())
on conflict (week_number, age_band) do nothing;

-- Week 1, age_13_14
insert into tpm.sessions (
  phase_id,
  week_number,
  age_band,
  title,
  subtitle,
  duration_min,
  outcome_promise,
  evidence_refs,
  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
) values
  (1, 1, 'age_13_14'::tpm.age_band,
   'Kickstart',
   'Explore your potential as a player',
   15,
   'Define your goals for the season and one habit to build them',
   '["AADC-1.1", "ICSE-2.2"]'::jsonb,
   'published'::tpm.content_status,
   null, null, now(), now())
on conflict (week_number, age_band) do nothing;

-- Week 2, age_7_9
insert into tpm.sessions (
  phase_id,
  week_number,
  age_band,
  title,
  subtitle,
  duration_min,
  outcome_promise,
  evidence_refs,
  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
) values
  (1, 2, 'age_7_9'::tpm.age_band,
   'Two seconds to reset',
   'Learn a tool to calm your mind',
   10,
   'Master one breathing trick you can use before any match',
   '["AADC-2.1", "ICSE-3.1"]'::jsonb,
   'published'::tpm.content_status,
   null, null, now(), now())
on conflict (week_number, age_band) do nothing;

-- Week 2, age_10_12
insert into tpm.sessions (
  phase_id,
  week_number,
  age_band,
  title,
  subtitle,
  duration_min,
  outcome_promise,
  evidence_refs,
  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
) values
  (1, 2, 'age_10_12'::tpm.age_band,
   'Two seconds to reset',
   'Calm your nervous system in a pinch',
   12,
   'Practice a two-breath reset technique to use before pressure moments',
   '["AADC-2.1", "ICSE-3.1"]'::jsonb,
   'published'::tpm.content_status,
   null, null, now(), now())
on conflict (week_number, age_band) do nothing;

-- Week 2, age_13_14
insert into tpm.sessions (
  phase_id,
  week_number,
  age_band,
  title,
  subtitle,
  duration_min,
  outcome_promise,
  evidence_refs,
  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
) values
  (1, 2, 'age_13_14'::tpm.age_band,
   'Two seconds to reset',
   'Control your activation under pressure',
   15,
   'Learn why pressure builds and how to redirect it into focus',
   '["AADC-2.1", "ICSE-3.1"]'::jsonb,
   'published'::tpm.content_status,
   null, null, now(), now())
on conflict (week_number, age_band) do nothing;

-- Week 3, age_7_9
insert into tpm.sessions (
  phase_id,
  week_number,
  age_band,
  title,
  subtitle,
  duration_min,
  outcome_promise,
  evidence_refs,
  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
) values
  (1, 3, 'age_7_9'::tpm.age_band,
   'Breathing space',
   'Give your mind permission to rest',
   10,
   'Understand why downtime makes you a better player',
   '["AADC-3.1", "ICSE-1.3"]'::jsonb,
   'published'::tpm.content_status,
   null, null, now(), now())
on conflict (week_number, age_band) do nothing;

-- Week 3, age_10_12
insert into tpm.sessions (
  phase_id,
  week_number,
  age_band,
  title,
  subtitle,
  duration_min,
  outcome_promise,
  evidence_refs,
  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
) values
  (1, 3, 'age_10_12'::tpm.age_band,
   'Breathing space',
   'Recovery is part of performance',
   12,
   'Plan one daily habit that recharges your energy tank',
   '["AADC-3.1", "ICSE-1.3"]'::jsonb,
   'published'::tpm.content_status,
   null, null, now(), now())
on conflict (week_number, age_band) do nothing;

-- Week 3, age_13_14
insert into tpm.sessions (
  phase_id,
  week_number,
  age_band,
  title,
  subtitle,
  duration_min,
  outcome_promise,
  evidence_refs,
  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
) values
  (1, 3, 'age_13_14'::tpm.age_band,
   'Breathing space',
   'Build resilience through rest',
   15,
   'Design a weekly recovery ritual that sustains your peak performance',
   '["AADC-3.1", "ICSE-1.3"]'::jsonb,
   'published'::tpm.content_status,
   null, null, now(), now())
on conflict (week_number, age_band) do nothing;

-- =============================================================================
-- 6. SESSION PROGRESS for Morgan J.
--    Week 1 + 2: complete, Week 3: in_progress at 40%
-- =============================================================================

-- Week 1 — complete
insert into tpm.session_progress (
  player_id,
  session_id,
  status,
  percent_complete,
  last_position_sec,
  started_at,
  completed_at,
  updated_at
) values
  (:MORGAN_ID,
   (select id from tpm.sessions where week_number = 1 and age_band = 'age_10_12'::tpm.age_band),
   'complete'::tpm.session_status,
   100,
   720,
   now() - interval '14 days',
   now() - interval '14 days',
   now() - interval '14 days')
on conflict (player_id, session_id) do nothing;

-- Week 2 — complete
insert into tpm.session_progress (
  player_id,
  session_id,
  status,
  percent_complete,
  last_position_sec,
  started_at,
  completed_at,
  updated_at
) values
  (:MORGAN_ID,
   (select id from tpm.sessions where week_number = 2 and age_band = 'age_10_12'::tpm.age_band),
   'complete'::tpm.session_status,
   100,
   720,
   now() - interval '7 days',
   now() - interval '7 days',
   now() - interval '7 days')
on conflict (player_id, session_id) do nothing;

-- Week 3 — in_progress at 40%
insert into tpm.session_progress (
  player_id,
  session_id,
  status,
  percent_complete,
  last_position_sec,
  started_at,
  completed_at,
  updated_at
) values
  (:MORGAN_ID,
   (select id from tpm.sessions where week_number = 3 and age_band = 'age_10_12'::tpm.age_band),
   'in_progress'::tpm.session_status,
   40,
   288,
   now() - interval '2 days',
   null,
   now() - interval '1 hour')
on conflict (player_id, session_id) do nothing;

-- =============================================================================
-- 7. WELLBEING CHECK-INS for Morgan J. (14 days, spread: 2x calm, 1x ready, 1x heavy)
-- =============================================================================

insert into tpm.wellbeing_checkins (
  player_id,
  session_id,
  mood_code,
  free_text,
  created_at
) values
  (:MORGAN_ID, null, 'calm'::tpm.mood_code, null, now() - interval '13 days'),
  (:MORGAN_ID, null, 'ready'::tpm.mood_code, null, now() - interval '10 days'),
  (:MORGAN_ID, null, 'calm'::tpm.mood_code, null, now() - interval '6 days'),
  (:MORGAN_ID, null, 'heavy'::tpm.mood_code, null, now() - interval '2 days')
on conflict do nothing;

-- =============================================================================
-- 8. WELLBEING SIGNAL for Jude P. (flag: heavy mood ×2 weeks, attendance drop)
-- =============================================================================

insert into tpm.wellbeing_signals (
  player_id,
  signal_type,
  rationale,
  status,
  acknowledged_by,
  acknowledged_at,
  computed_at,
  window_days
) values
  (:JUDE_ID,
   'flag'::tpm.signal_type,
   'Heavy mood ×2 weeks, attendance dropped 4/4 → 1/4',
   'new'::tpm.signal_status,
   null,
   null,
   now() - interval '1 day',
   14)
on conflict do nothing;

-- =============================================================================
-- END OF FIXTURES
-- =============================================================================
