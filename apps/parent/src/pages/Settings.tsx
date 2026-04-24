// Parent settings — consent management, GDPR export/delete.
// Toggling a consent writes a new row to tpm.consents (the audit trigger logs
// it automatically). The app reads the latest non-revoked row per type.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ConsentType } from '@tpm/supabase';

type ConsentRow = { consent_type: ConsentType; granted: boolean };

const LABELS: Record<ConsentType, { title: string; desc: string; locked?: boolean }> = {
  app_use:            { title: 'Use of the Player app',         desc: 'Required for the programme.', locked: true },
  coach_patterns:     { title: 'Coach sees 14-day patterns',    desc: 'Safeguarding requirement.',    locked: true },
  digest_email:       { title: 'Sunday digest email',           desc: 'Optional. Unsubscribe any time.' },
  research_data:      { title: 'Research & outcome data',       desc: 'Anonymised. Opt in to help us improve the programme.' },
  marketing_updates:  { title: 'Product updates',               desc: 'Occasional. Never promotional to your child.' },
};

export function Settings() {
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [consents, setConsents] = useState<Record<ConsentType, boolean>>({
    app_use: false, coach_patterns: false, digest_email: false, research_data: false, marketing_updates: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: links } = await supabase
        .from('player_parents')
        .select('players(id, first_name)')
        .eq('parent_user_id', auth.user.id);
      // @ts-expect-error nested
      const child = links?.[0]?.players;
      if (!child) { setLoading(false); return; }
      setChildId(child.id);
      setChildName(child.first_name);

      const { data: rows } = await supabase
        .from('consents')
        .select('consent_type, granted, granted_at')
        .eq('player_id', child.id)
        .is('revoked_at', null)
        .order('granted_at', { ascending: false });
      const latest: Record<string, boolean> = {};
      (rows as ConsentRow[] | null)?.forEach((r) => {
        if (!(r.consent_type in latest)) latest[r.consent_type] = r.granted;
      });
      setConsents((prev) => ({ ...prev, ...latest }));
      setLoading(false);
    })();
  }, []);

  const toggle = async (type: ConsentType) => {
    if (!childId) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const next = !consents[type];
    setConsents((c) => ({ ...c, [type]: next }));
    await supabase.from('consents').insert({
      player_id: childId,
      parent_user_id: auth.user.id,
      consent_type: type,
      granted: next,
      document_version: 1,
    });
  };

  if (loading) return <div style={{ padding: 24 }}><p className="eyebrow">Loading…</p></div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
          Settings &amp; consent
        </p>
        <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20 }}>
          {childName} · parent account
        </p>
      </header>

      <p style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
        Your consents
      </p>

      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {(Object.keys(LABELS) as ConsentType[]).map((type) => (
          <label key={type} className="card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: LABELS[type].locked ? 'not-allowed' : 'pointer' }}>
            <input
              type="checkbox"
              checked={consents[type]}
              disabled={LABELS[type].locked}
              onChange={() => toggle(type)}
              style={{ marginTop: 2, width: 18, height: 18, accentColor: 'var(--gold-500)' }}
            />
            <div>
              <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--navy-900)' }}>
                {LABELS[type].title}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ink-muted)' }}>
                {LABELS[type].desc}
              </p>
            </div>
          </label>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, background: '#fdecec', borderColor: 'var(--alert)' }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--alert)' }}>
          Export or delete {childName}'s data
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ink)' }}>
          Under UK GDPR you can request a full export or full deletion any time.
        </p>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary">Request export</button>
          <button className="btn btn-secondary" style={{ color: 'var(--alert)', borderColor: 'var(--alert)' }}>Request deletion</button>
        </div>
      </div>
    </div>
  );
}
