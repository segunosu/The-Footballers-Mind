// Parent view of their child's progress — tools earned, sessions completed.
// Critical boundary: never exposes raw mood check-ins.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Tool = { week_number: number; title: string };

export function ChildProgress() {
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: links } = await supabase
        .from('player_parents')
        .select('players(id, first_name, age_band)')
        .eq('parent_user_id', auth.user.id);
      // @ts-expect-error nested
      const child = links?.[0]?.players;
      if (!child) { setLoading(false); return; }
      setChildName(child.first_name);

      const { count: total } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('age_band', child.age_band)
        .eq('status', 'published');
      setTotalSessions(total ?? 0);

      const { data: done } = await supabase
        .from('session_progress')
        .select('sessions(week_number, title), status')
        .eq('player_id', child.id)
        .eq('status', 'complete')
        .order('sessions(week_number)', { ascending: false });

      const rows: Tool[] =
        // @ts-expect-error nested
        done?.map((r) => ({ week_number: r.sessions.week_number, title: r.sessions.title })) ?? [];
      setTools(rows);
      setCompleted(rows.length);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}><p className="eyebrow">Loading…</p></div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            {childName}'s progress
          </p>
          <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20 }}>
            {completed}{totalSessions ? ` / ${totalSessions}` : ''} sessions
          </p>
        </div>
        <div className="tpm-mark">TPM</div>
      </header>

      <p style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
        Tools {childName} has now
      </p>

      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {tools.length === 0 ? (
          <div className="card"><p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No tools unlocked yet — {childName}'s first session is coming.</p></div>
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

      <div className="card" style={{ marginTop: 16, background: 'var(--navy-100)', border: 0 }}>
        <p className="eyebrow">Safeguarding</p>
        <p style={{ fontSize: 12, color: 'var(--ink)', marginTop: 6 }}>
          We don't share {childName}'s mood check-ins with you. The coach only
          sees 14-day patterns, not single answers.
        </p>
      </div>
    </div>
  );
}
