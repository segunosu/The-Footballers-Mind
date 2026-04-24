// Club-wide consent audit. Admin-only. Shows each player's currently-granted
// consents so the welfare officer can spot gaps quickly.

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRoles } from '../../hooks/useRoles';
import type { ConsentType } from '@tpm/supabase';

type Row = { player_id: string; name: string; consents: Partial<Record<ConsentType, boolean>> };

const TYPES: ConsentType[] = ['app_use', 'coach_patterns', 'digest_email', 'research_data'];
const LABELS: Record<ConsentType, string> = {
  app_use: 'App',
  coach_patterns: 'Coach',
  digest_email: 'Digest',
  research_data: 'Research',
  marketing_updates: 'Marketing',
};

export function AdminConsents() {
  const { isClubAdmin, clubIds } = useRoles();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!clubIds.length) return;
    (async () => {
      const clubId = clubIds[0];
      const { data: members } = await supabase
        .from('squad_members')
        .select('player_id, players(first_name, last_initial), squads!inner(club_id)')
        .eq('squads.club_id', clubId);

      const out: Row[] = [];
      for (const m of members ?? []) {
        // @ts-expect-error nested
        const name = `${m.players?.first_name ?? ''} ${m.players?.last_initial ?? ''}`.trim();
        const { data: consents } = await supabase
          .from('consents')
          .select('consent_type, granted, granted_at')
          .eq('player_id', m.player_id)
          .is('revoked_at', null);
        const cmap: Partial<Record<ConsentType, boolean>> = {};
        (consents ?? []).forEach((c) => {
          // last-write-wins within active (non-revoked) rows
          cmap[c.consent_type as ConsentType] = c.granted;
        });
        out.push({ player_id: m.player_id, name, consents: cmap });
      }
      setRows(out);
    })();
  }, [clubIds]);

  if (!isClubAdmin) return <div style={{ padding: 24 }}><p>Admin access only.</p></div>;

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 24 }}>
      <header style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <p className="eyebrow">Admin · consents</p>
        <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)' }}>Consent audit</h2>
        <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 6 }}>
          Current active consents per player. Missing required consents (App,
          Coach) mean that player cannot use the programme.
        </p>
      </header>

      <div style={{ marginTop: 16, display: 'grid', gap: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)', gap: 6, fontSize: 10, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, padding: '0 10px' }}>
          <span>Player</span>
          {TYPES.map((t) => <span key={t} style={{ textAlign: 'center' }}>{LABELS[t]}</span>)}
        </div>
        {rows.map((r) => (
          <div key={r.player_id} className="card" style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)', gap: 6, padding: '8px 10px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{r.name}</span>
            {TYPES.map((t) => {
              const v = r.consents[t];
              const required = t === 'app_use' || t === 'coach_patterns';
              const ok = v === true;
              const missingRequired = required && !ok;
              return (
                <span key={t} style={{ textAlign: 'center', fontSize: 14, color: missingRequired ? 'var(--alert)' : ok ? 'var(--pitch)' : 'var(--ink-muted)' }}>
                  {ok ? '✓' : missingRequired ? '!' : '—'}
                </span>
              );
            })}
          </div>
        ))}
        {rows.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No players in the club yet.</p>}
      </div>
    </div>
  );
}
