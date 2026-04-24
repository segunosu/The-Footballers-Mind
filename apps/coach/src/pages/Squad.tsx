// Coach squad dashboard — reads the coach's squads, their members, and
// wellbeing signals (NOT raw check-ins, which coaches never see).

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Player } from '@tpm/supabase';

type SquadPlayer = Player & { has_flag?: boolean };

export function Squad() {
  const [loading, setLoading] = useState(true);
  const [squadName, setSquadName] = useState<string>('');
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [flagCount, setFlagCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      // Find the first squad this coach manages
      const { data: roles } = await supabase
        .from('user_roles')
        .select('squad_id, squads(name)')
        .eq('user_id', auth.user.id)
        .eq('role', 'coach')
        .limit(1);
      const squadId = roles?.[0]?.squad_id;
      // @ts-expect-error — nested join types omitted for brevity
      setSquadName(roles?.[0]?.squads?.name ?? 'Squad');

      if (!squadId) {
        setLoading(false);
        return;
      }

      const { data: members } = await supabase
        .from('squad_members')
        .select('player_id, players(*)')
        .eq('squad_id', squadId);

      const ps: SquadPlayer[] =
        // @ts-expect-error nested
        members?.map((m) => m.players).filter(Boolean) ?? [];

      // Open signals for these players
      if (ps.length) {
        const { data: signals } = await supabase
          .from('wellbeing_signals')
          .select('player_id, signal_type, status')
          .in('player_id', ps.map((p) => p.id))
          .eq('status', 'new');
        const flagged = new Set(signals?.filter((s) => s.signal_type === 'flag').map((s) => s.player_id) ?? []);
        ps.forEach((p) => ((p as SquadPlayer).has_flag = flagged.has(p.id)));
        setFlagCount(flagged.size);
      }
      setPlayers(ps);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}><p className="eyebrow">Loading…</p></div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Unity FC Academy</p>
          <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20 }}>{squadName} · {players.length} players</p>
        </div>
        <div className="tpm-mark">TPM</div>
      </header>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <span className={flagCount ? 'chip chip-alert' : 'chip chip-pitch'}>
          {flagCount ? `${flagCount} flag${flagCount === 1 ? '' : 's'}` : 'No flags'}
        </span>
        <span className="chip">{players.length} in squad</span>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {players.map((p) => (
          <div
            key={p.id}
            className="card"
            style={{
              padding: '10px 12px',
              borderLeft: p.has_flag ? '3px solid var(--alert)' : undefined,
            }}
          >
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--navy-900)' }}>
              {p.first_name} {p.last_initial ?? ''}
            </p>
            {p.has_flag && (
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--alert)', fontWeight: 700 }}>
                Flag · open — see Signals
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
