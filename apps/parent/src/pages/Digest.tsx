// Parent weekly digest — reads the child's toolkit (tools unlocked) via the
// safe view. Never reads the child's raw mood check-ins.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Tool = { week_number: number; tool_title: string };

export function Digest() {
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('your child');
  const [tools, setTools] = useState<Tool[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      const { data: links } = await supabase
        .from('player_parents')
        .select('players(id, first_name)')
        .eq('parent_user_id', auth.user.id);
      // @ts-expect-error nested
      const child = links?.[0]?.players;
      if (child) setChildName(child.first_name);
      if (child?.id) {
        const { data: t } = await supabase
          .from('v_parent_child_toolkit')
          .select('week_number, tool_title')
          .eq('player_id', child.id)
          .order('week_number', { ascending: false });
        setTools(t ?? []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}><p className="eyebrow">Loading…</p></div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Unity FC Academy</p>
          <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20 }}>{childName} · this week</p>
        </div>
        <div className="tpm-mark">TPM</div>
      </header>

      <section className="hero" style={{ marginTop: 16 }}>
        <p className="eyebrow">Try this at home</p>
        <h3 style={{ color: '#fff', marginTop: 6 }}>Ask {childName} to show you this week's tool.</h3>
        <p style={{ color: '#c6d0e4', fontSize: 13, marginTop: 10 }}>
          Beats "were you good today?" — gets something specific back in 10 seconds.
        </p>
      </section>

      <h2 style={{ marginTop: 24, fontSize: 'var(--text-lg)' }}>Tools {childName} has now</h2>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {tools.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No tools unlocked yet — first session coming soon.</p>
        ) : (
          tools.map((t) => (
            <div key={t.week_number} className="card">
              <p style={{ margin: 0, fontSize: 10, color: 'var(--gold-600)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                Week {t.week_number}
              </p>
              <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--navy-900)' }}>
                {t.tool_title}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 16, background: 'var(--navy-100)', border: 0 }}>
        <p className="eyebrow">Safeguarding</p>
        <p style={{ fontSize: 12, color: 'var(--ink)', marginTop: 6 }}>
          We don't share {childName}'s mood check-ins with you. Your coach only
          sees 14-day patterns.
        </p>
      </div>
    </div>
  );
}
