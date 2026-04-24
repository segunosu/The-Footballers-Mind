// Admin overview — club-wide counts + quick links.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useRoles } from '../../hooks/useRoles';

type Counts = {
  squads: number;
  coaches: number;
  players: number;
  parents: number;
  open_flags: number;
};

export function AdminOverview() {
  const { loading: rolesLoading, isClubAdmin, clubIds } = useRoles();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [clubName, setClubName] = useState('');

  useEffect(() => {
    if (!clubIds.length) return;
    (async () => {
      const clubId = clubIds[0];
      const [{ data: club }, { count: squads }, { count: coaches }, { count: players }, { count: parents }, { count: openFlags }] = await Promise.all([
        supabase.from('clubs').select('name').eq('id', clubId).single(),
        supabase.from('squads').select('id', { count: 'exact', head: true }).eq('club_id', clubId),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('role', 'coach'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('role', 'player'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('role', 'parent'),
        supabase.from('wellbeing_signals').select('id', { count: 'exact', head: true }).eq('status', 'new').eq('signal_type', 'flag'),
      ]);
      setClubName(club?.name ?? 'Club');
      setCounts({
        squads: squads ?? 0,
        coaches: coaches ?? 0,
        players: players ?? 0,
        parents: parents ?? 0,
        open_flags: openFlags ?? 0,
      });
    })();
  }, [clubIds]);

  if (rolesLoading) return <div style={{ padding: 24 }}><p className="eyebrow">Loading…</p></div>;
  if (!isClubAdmin) return <div style={{ padding: 24 }}><p>Admin access only.</p></div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <p className="eyebrow">Admin · overview</p>
        <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)' }}>{clubName}</h2>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
        {counts && ([
          { label: 'Squads', n: counts.squads, to: '/admin/squads' },
          { label: 'Coaches', n: counts.coaches, to: '/admin/coaches' },
          { label: 'Players', n: counts.players },
          { label: 'Parents', n: counts.parents },
          { label: 'Open flags', n: counts.open_flags, to: '/signals', alert: counts.open_flags > 0 },
          { label: 'Data requests', n: 0, to: '/admin/data' },
        ]).map((c) => (
          <Link
            key={c.label}
            to={c.to ?? '#'}
            className="card"
            style={{ textDecoration: 'none', color: 'var(--ink)', padding: 14, borderLeft: c.alert ? '3px solid var(--alert)' : undefined }}
          >
            <p className="eyebrow">{c.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: c.alert ? 'var(--alert)' : 'var(--navy-900)', marginTop: 6 }}>
              {c.n}
            </p>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, background: 'var(--navy-100)', border: 0 }}>
        <p className="eyebrow">Club admin responsibilities</p>
        <p style={{ fontSize: 12, color: 'var(--ink)', marginTop: 6, lineHeight: 1.5 }}>
          You manage squads, invite coaches, review club-wide consent status, and
          handle GDPR data-subject requests. Wellbeing flags escalate to you and
          to the Club Welfare Officer automatically.
        </p>
      </div>
    </div>
  );
}
