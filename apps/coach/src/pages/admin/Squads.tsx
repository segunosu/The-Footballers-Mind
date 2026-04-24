// Admin view: create + manage squads within the club.

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRoles } from '../../hooks/useRoles';
import type { AgeBand } from '@tpm/supabase';

type SquadRow = { id: string; name: string; age_band: AgeBand; season: string | null; members: number };

const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: 'age_7_9', label: '7–9' },
  { value: 'age_10_12', label: '10–12' },
  { value: 'age_13_14', label: '13–14' },
];

export function AdminSquads() {
  const { isClubAdmin, clubIds } = useRoles();
  const [squads, setSquads] = useState<SquadRow[]>([]);
  const [newName, setNewName] = useState('');
  const [newBand, setNewBand] = useState<AgeBand>('age_10_12');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!clubIds.length) return;
    const { data } = await supabase
      .from('squads')
      .select('id, name, age_band, season')
      .eq('club_id', clubIds[0])
      .order('age_band')
      .order('name');

    const rows: SquadRow[] = [];
    for (const s of data ?? []) {
      const { count } = await supabase
        .from('squad_members')
        .select('id', { count: 'exact', head: true })
        .eq('squad_id', s.id);
      rows.push({ ...s, members: count ?? 0 });
    }
    setSquads(rows);
  };

  useEffect(() => { load(); }, [clubIds]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !clubIds.length) return;
    setBusy(true);
    await supabase.from('squads').insert({
      club_id: clubIds[0],
      name: newName.trim(),
      age_band: newBand,
      season: '2025-26',
    });
    setNewName('');
    await load();
    setBusy(false);
  };

  if (!isClubAdmin) return <div style={{ padding: 24 }}><p>Admin access only.</p></div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <p className="eyebrow">Admin · squads</p>
        <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)' }}>Manage squads</h2>
      </header>

      <form onSubmit={create} className="card" style={{ marginTop: 16 }}>
        <p className="eyebrow">New squad</p>
        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          <input className="input" placeholder="Squad name, e.g. U10 Reds" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <select className="select" value={newBand} onChange={(e) => setNewBand(e.target.value as AgeBand)}>
            {AGE_BANDS.map((b) => <option key={b.value} value={b.value}>Age {b.label}</option>)}
          </select>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create squad'}</button>
        </div>
      </form>

      <p className="eyebrow" style={{ marginTop: 20 }}>Existing squads · {squads.length}</p>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {squads.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No squads yet.</p>
        ) : (
          squads.map((s) => (
            <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--navy-900)', fontSize: 14 }}>{s.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-muted)' }}>
                  Age {AGE_BANDS.find((b) => b.value === s.age_band)?.label} · {s.season ?? '—'} · {s.members} member{s.members === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
