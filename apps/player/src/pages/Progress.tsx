// Player progress screen — streak + tools unlocked, no peer comparisons.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Tool = { week_number: number; title: string; completed_at: string | null };

export function Progress() {
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<Tool[]>([]);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }

      const { data: players } = await supabase
        .from('players').select('id, first_name, age_band').eq('profile_id', auth.user.id).limit(1);
      const player = players?.[0];
      if (!player) { setLoading(false); return; }
      setFirstName(player.first_name);

      const { data: done } = await supabase
        .from('session_progress')
        .select('completed_at, sessions(week_number, title)')
        .eq('player_id', player.id)
        .eq('status', 'complete')
        .order('completed_at', { ascending: false });

      const rows: Tool[] =
        // @ts-expect-error nested join
        done?.map((r) => ({ week_number: r.sessions.week_number, title: r.sessions.title, completed_at: r.completed_at })) ?? [];
      setTools(rows);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="app-shell"><p className="eyebrow">Loading…</p></div>;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="club-mark">
          <div className="crest">UFC</div>
          <div>
            <p className="club-name">Your progress</p>
            <p className="club-role">{firstName} · {tools.length} session{tools.length === 1 ? '' : 's'} done</p>
          </div>
        </div>
        <div className="tpm-mark">TPM</div>
      </header>

      <section className="hero" style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 44, color: 'var(--gold-500)', lineHeight: 1 }}>
          {tools.length}
        </div>
        <p className="eyebrow" style={{ marginTop: 4 }}>
          tools you've unlocked
        </p>
        <p style={{ color: '#c6d0e4', fontSize: 12, marginTop: 6 }}>
          No comparisons to anyone else. Just your own work.
        </p>
      </section>

      <h2 style={{ marginTop: 20, fontSize: 'var(--text-lg)' }}>Your toolkit</h2>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {tools.length === 0 ? (
          <div className="card"><p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Complete your first session and your first tool lands here.</p></div>
        ) : (
          tools.map((t) => (
            <div key={t.week_number} className="card">
              <p className="eyebrow">Week {t.week_number}</p>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
                {t.title}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
