// Admin view: manage coaches + generate invite tokens.

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRoles } from '../../hooks/useRoles';

type CoachRow = { user_id: string; squad_name: string; display_name: string; email: string };

export function AdminCoaches() {
  const { isClubAdmin, clubIds } = useRoles();
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSquad, setInviteSquad] = useState<string>('');
  const [squads, setSquads] = useState<{ id: string; name: string }[]>([]);
  const [sentToken, setSentToken] = useState<string | null>(null);

  useEffect(() => {
    if (!clubIds.length) return;
    (async () => {
      const clubId = clubIds[0];
      const [{ data: coachRoles }, { data: sqs }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('user_id, squad_id, profiles(display_name, email), squads(name)')
          .eq('club_id', clubId)
          .eq('role', 'coach'),
        supabase.from('squads').select('id, name').eq('club_id', clubId).order('name'),
      ]);
      setSquads(sqs ?? []);
      setCoaches(
        // @ts-expect-error nested
        (coachRoles ?? []).map((r) => ({
          user_id: r.user_id,
          squad_name: r.squads?.name ?? '—',
          display_name: r.profiles?.display_name ?? '—',
          email: r.profiles?.email ?? '',
        })),
      );
    })();
  }, [clubIds]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubIds.length || !inviteSquad || !inviteEmail.trim()) return;
    const { data, error } = await supabase
      .from('invites')
      .insert({
        club_id: clubIds[0],
        squad_id: inviteSquad,
        target_role: 'coach',
        target_email: inviteEmail.trim(),
      })
      .select('token')
      .single();
    if (error) return;
    setSentToken(data.token);
    setInviteEmail('');
  };

  if (!isClubAdmin) return <div style={{ padding: 24 }}><p>Admin access only.</p></div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <p className="eyebrow">Admin · coaches</p>
        <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)' }}>Coaches</h2>
      </header>

      <form onSubmit={sendInvite} className="card" style={{ marginTop: 16 }}>
        <p className="eyebrow">Invite a coach</p>
        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          <input className="input" type="email" placeholder="coach@yourclub.co.uk" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
          <select className="select" value={inviteSquad} onChange={(e) => setInviteSquad(e.target.value)} required>
            <option value="">Assign to squad…</option>
            {squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" type="submit">Send invite</button>
        </div>
        {sentToken && (
          <p style={{ marginTop: 12, fontSize: 11, color: 'var(--ink-muted)' }}>
            Invite created. Token: <code style={{ background: 'var(--paper)', padding: '2px 6px', borderRadius: 4 }}>{sentToken.slice(0, 10)}…</code>
          </p>
        )}
      </form>

      <p className="eyebrow" style={{ marginTop: 20 }}>Current coaches · {coaches.length}</p>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {coaches.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No coaches yet.</p>
        ) : (
          coaches.map((c) => (
            <div key={c.user_id + c.squad_name} className="card">
              <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{c.display_name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-muted)' }}>{c.email} · {c.squad_name}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
