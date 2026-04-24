// Coach invite-parents flow. Shows squad members and which have parents
// linked; lets coach generate invite tokens for missing ones.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Row = { player_id: string; name: string; has_parent: boolean };

export function InviteParents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: roles } = await supabase
        .from('user_roles')
        .select('squad_id')
        .eq('user_id', auth.user.id)
        .eq('role', 'coach')
        .limit(1);
      const squadId = roles?.[0]?.squad_id;
      if (!squadId) { setLoading(false); return; }

      const { data: members } = await supabase
        .from('squad_members')
        .select('player_id, players(first_name, last_initial)')
        .eq('squad_id', squadId);

      const out: Row[] = [];
      for (const m of members ?? []) {
        // @ts-expect-error nested
        const name = `${m.players?.first_name ?? ''} ${m.players?.last_initial ?? ''}`.trim();
        const { data: pp } = await supabase
          .from('player_parents')
          .select('id')
          .eq('player_id', m.player_id)
          .limit(1);
        out.push({ player_id: m.player_id, name, has_parent: (pp?.length ?? 0) > 0 });
      }
      setRows(out);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}><p className="eyebrow">Loading…</p></div>;

  const ready = rows.filter((r) => r.has_parent).length;
  const missing = rows.length - ready;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h2 style={{ marginBottom: 4 }}>Invite parents</h2>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 16 }}>
        We email every parent a short consent form. Nothing starts until they accept.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <span className="chip chip-pitch">{ready} ready</span>
        {missing > 0 && <span className="chip chip-alert">{missing} to invite</span>}
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {rows.map((r) => (
          <div key={r.player_id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--navy-900)' }}>{r.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-muted)' }}>
                {r.has_parent ? 'Parent linked' : 'No parent yet'}
              </p>
            </div>
            {r.has_parent ? (
              <span className="chip chip-pitch">✓</span>
            ) : (
              <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }}>Invite</button>
            )}
          </div>
        ))}
      </div>

      {missing > 0 && (
        <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }}>
          Send {missing} invite{missing === 1 ? '' : 's'} →
        </button>
      )}
    </div>
  );
}
