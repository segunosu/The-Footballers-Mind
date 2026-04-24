// Post-session wellbeing check-in. Child-only write; coaches and parents can
// never read raw check-ins.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { MoodCode } from '@tpm/supabase';

const OPTIONS: { code: MoodCode; emoji: string; label: string }[] = [
  { code: 'calm', emoji: '😌', label: 'Calm' },
  { code: 'ready', emoji: '💪', label: 'Ready' },
  { code: 'heavy', emoji: '🌧️', label: 'Heavy' },
  { code: 'buzzing', emoji: '⚡', label: 'Buzzing' },
];

export function CheckIn() {
  const nav = useNavigate();
  const [picked, setPicked] = useState<MoodCode | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!picked) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      return;
    }
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('profile_id', auth.user.id)
      .limit(1);
    if (players?.[0]) {
      await supabase.from('wellbeing_checkins').insert({
        player_id: players[0].id,
        mood_code: picked,
      });
    }
    setSaving(false);
    nav('/');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="club-mark">
          <div>
            <p className="club-name">Quick check-in</p>
            <p className="club-role">Takes 20 seconds</p>
          </div>
        </div>
        <div className="tpm-mark">TPM</div>
      </header>

      <div className="card">
        <p className="eyebrow">Before we finish</p>
        <h2 style={{ fontSize: 'var(--text-md)', marginTop: 6 }}>How was it in your body today?</h2>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-muted)' }}>Tap one. No right answer.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        {OPTIONS.map((o) => (
          <button
            key={o.code}
            className="card"
            onClick={() => setPicked(o.code)}
            style={{
              textAlign: 'center',
              padding: 18,
              cursor: 'pointer',
              border: picked === o.code ? '2px solid var(--gold-500)' : '1px solid var(--line)',
              background: picked === o.code ? 'var(--gold-100)' : undefined,
            }}
          >
            <div style={{ fontSize: 26 }}>{o.emoji}</div>
            <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{o.label}</p>
          </button>
        ))}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={save} disabled={!picked || saving}>
        {saving ? 'Saving…' : 'Log & finish →'}
      </button>
      <p style={{ fontSize: 10, color: 'var(--ink-muted)', textAlign: 'center', marginTop: 8 }}>
        Your coach sees patterns, not single answers.
      </p>
    </div>
  );
}
