-- =============================================================================
-- TPM — RLS safeguarding test suite
-- =============================================================================
-- Proves that the row-level-security policies hold under adversarial conditions.
-- Run via Supabase MCP apply/execute_sql or via psql with the service-role key.
--
-- The suite impersonates each demo user via request.jwt.claim.sub and confirms
-- that the expected rows are visible (or invisible) to that role.
--
-- Dependency: the demo auth users + profiles + roles seeded by
-- `fixtures_dev.sql` (or the equivalent direct insert path) must exist:
--   - 550e8400-e29b-41d4-a716-446655440001  (club_admin — Alex)
--   - 550e8400-e29b-41d4-a716-446655440002  (coach      — Morris)
--   - 550e8400-e29b-41d4-a716-446655440003  (parent     — James, of Morgan)
--
-- RUN:
--   supabase db remote run tpm/supabase/rls_safeguarding_tests.sql
--   or via Supabase MCP:
--     mcp execute_sql --project <ref> --query "$(cat rls_safeguarding_tests.sql)"
--
-- OUTPUT:
--   Table of (test, expected, actual, pass).
--   Every row MUST have pass = true or the deploy is blocked.
-- =============================================================================

-- Ensure fixture: at least one raw check-in exists for Morgan so the
-- hardest-boundary tests (T1 & T2) are meaningful.
insert into tpm.wellbeing_checkins (player_id, mood_code)
select p.id, 'heavy'::tpm.mood_code
from tpm.players p
where p.first_name = 'Morgan' and p.last_initial = 'J.'
on conflict do nothing;

set role authenticated;

with
  t1 as (select set_config('request.jwt.claim.sub', '550e8400-e29b-41d4-a716-446655440002', true) settings,
               set_config('request.jwt.claims', '{"sub":"550e8400-e29b-41d4-a716-446655440002","role":"authenticated"}', true)),
  r1 as (select count(*) n from tpm.wellbeing_checkins, t1),
  t2 as (select set_config('request.jwt.claim.sub', '550e8400-e29b-41d4-a716-446655440003', true) settings),
  r2 as (select count(*) n from tpm.wellbeing_checkins, t2),
  r3 as (select count(*) n from tpm.players where first_name = 'Aisha'),
  t4 as (select set_config('request.jwt.claim.sub', '550e8400-e29b-41d4-a716-446655440002', true) settings),
  r4 as (select count(*) n from tpm.wellbeing_signals, t4),
  t5 as (select set_config('request.jwt.claim.sub', '550e8400-e29b-41d4-a716-446655440003', true) settings),
  r5 as (select count(*) n from tpm.wellbeing_signals, t5),
  r6 as (select count(*) n from tpm.sessions where status = 'published'),
  r8 as (select count(*) n from tpm.players where first_name = 'Morgan'),
  t9 as (select set_config('request.jwt.claim.sub', '550e8400-e29b-41d4-a716-446655440002', true) settings),
  r9 as (select count(*) n from tpm.players, t9),
  t10 as (select set_config('request.jwt.claim.sub', '550e8400-e29b-41d4-a716-446655440003', true) settings),
  r10 as (select count(*) n from tpm.consents, t10)
select 'T1 coach reads raw checkins'         as test, '0 rows'      as expected,
       r1.n::text || ' rows'                 as actual, (r1.n = 0)  as pass from r1
union all
select 'T2 parent reads raw checkins',        '0 rows', r2.n::text || ' rows', r2.n = 0 from r2
union all
select 'T3 parent reads unrelated player',    '0 rows', r3.n::text || ' rows', r3.n = 0 from r3
union all
select 'T4 coach reads squad signals',        '>= 1 row', r4.n::text || ' rows', r4.n >= 1 from r4
union all
select 'T5 parent reads signals',             '0 rows', r5.n::text || ' rows', r5.n = 0 from r5
union all
select 'T6 parent reads published sessions',  '>= 9 rows', r6.n::text || ' rows', r6.n >= 9 from r6
union all
select 'T8 parent reads own child',           '= 1 row', r8.n::text || ' rows', r8.n = 1 from r8
union all
select 'T9 coach reads squad players',        '>= 3 rows', r9.n::text || ' rows', r9.n >= 3 from r9
union all
select 'T10 parent reads own consents',       '>= 4 rows', r10.n::text || ' rows', r10.n >= 4 from r10;

reset role;

-- =============================================================================
-- INTERPRETING FAILURES
-- =============================================================================
-- T1 fail: a coach can read raw mood data — SAFEGUARDING BREACH. Check policy
--   `wellbeing_checkins_self_rw` and confirm tpm.is_self_player(player_id) is
--   the ONLY route for non-super_admin.
--
-- T2 fail: a parent can read raw mood data — SAFEGUARDING BREACH. Same policy;
--   parents should never satisfy is_self_player for their child.
--
-- T3 fail: a parent can read another family's child. Check policy
--   `players_read` — it must require tpm.is_parent_of_player(id) for the
--   parent branch.
--
-- T4 fail: a coach cannot read their squad's signals. Check policy
--   `signals_coach_read` + `tpm.is_coach_of_player` function.
--
-- T5 fail: a parent can read signals — information leak. Parents have no
--   policy granting signals access, so this is a bug in the policy set.
-- =============================================================================
