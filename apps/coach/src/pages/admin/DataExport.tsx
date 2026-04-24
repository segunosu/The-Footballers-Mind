// Data export / deletion requests intake. Admin-only. Creates an audit-log
// entry; actual export / deletion runs via a separate workflow (TPM staff
// process in v1 — automated in a later version).

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRoles } from '../../hooks/useRoles';

type Req = { id: string; action: string; entity_id: string | null; created_at: string; metadata: Record<string, unknown> };

export function AdminDataExport() {
  const { isClubAdmin } = useRoles();
  const [requests, setRequests] = useState<Req[]>([]);
  const [childName, setChildName] = useState('');
  const [kind, setKind] = useState<'export' | 'delete'>('export');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('id, action, entity_id, created_at, metadata')
        .in('action', ['data.export_requested', 'data.delete_requested'])
        .order('created_at', { ascending: false })
        .limit(50);
      setRequests((data ?? []) as Req[]);
    })();
  }, [submitted]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from('audit_log').insert({
      actor_user_id: auth.user.id,
      action: kind === 'export' ? 'data.export_requested' : 'data.delete_requested',
      entity_type: 'player',
      entity_id: null,
      metadata: { child_name: childName, requested_via: 'admin_console' },
    });
    setChildName('');
    setSubmitted((s) => !s);
  };

  if (!isClubAdmin) return <div style={{ padding: 24 }}><p>Admin access only.</p></div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <p className="eyebrow">Admin · data requests</p>
        <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)' }}>GDPR export &amp; delete</h2>
        <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 6 }}>
          Log a data-subject request here. TPM staff fulfil it within 30 days
          as required by UK GDPR.
        </p>
      </header>

      <form onSubmit={submit} className="card" style={{ marginTop: 16 }}>
        <p className="eyebrow">New request</p>
        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          <input className="input" placeholder="Child name (first + last initial)" value={childName} onChange={(e) => setChildName(e.target.value)} required />
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as 'export' | 'delete')}>
            <option value="export">Export all data</option>
            <option value="delete">Delete all data</option>
          </select>
          <button className="btn btn-primary" type="submit">Log request</button>
        </div>
      </form>

      <p className="eyebrow" style={{ marginTop: 20 }}>Request log</p>
      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        {requests.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No requests yet.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="card" style={{ padding: 10 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: r.action.includes('delete') ? 'var(--alert)' : 'var(--navy-900)' }}>
                {r.action === 'data.export_requested' ? 'Export' : 'Delete'} · {String(r.metadata?.child_name ?? '')}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--ink-muted)' }}>
                {new Date(r.created_at).toLocaleString('en-GB')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
