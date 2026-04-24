import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type SignalRow = {
  id: string;
  player_id: string;
  signal_type: 'flag' | 'nudge' | 'good';
  rationale: string;
  status: string;
  computed_at: string;
  player_name?: string;
};

export function Signals() {
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('wellbeing_signals')
        .select('id, player_id, signal_type, rationale, status, computed_at, players(first_name, last_initial)')
        .order('computed_at', { ascending: false })
        .limit(50);

      const enriched: SignalRow[] =
        // @ts-expect-error nested
        data?.map((r) => ({ ...r, player_name: `${r.players?.first_name ?? ''} ${r.players?.last_initial ?? ''}`.trim() })) ?? [];
      setRows(enriched);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}><p className="eyebrow">Loading…</p></div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h2 style={{ marginBottom: 4 }}>Wellbeing signals</h2>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 16 }}>
        Pattern-based. You never see individual check-in answers.
      </p>
      {rows.length === 0 ? (
        <p>No signals. All good.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                borderLeft: `3px solid ${s.signal_type === 'flag' ? 'var(--alert)' : s.signal_type === 'good' ? 'var(--pitch)' : 'var(--gold-500)'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{s.player_name || 'Player'}</span>
                <span style={{ fontSize: 10, color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {s.signal_type} · {s.status}
                </span>
              </div>
              <p style={{ fontSize: 12, margin: 0, color: 'var(--ink)' }}>{s.rationale}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
