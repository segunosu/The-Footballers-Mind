// Coach-facing facilitation guide — loads from public/facilitation-guides.json
// at runtime and renders the 4-part structure + "what to say" lines, plus
// safeguarding + equipment callouts for the requested session.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Session } from '@tpm/supabase';

type Part = {
  name: string;
  duration_min: number;
  what_to_do: string | string[];
  what_to_say: string;
};
type Guide = {
  session_key: string;
  week_number: number;
  age_band: string;
  session_title: string;
  total_minutes: number;
  parts: Part[];
  safeguarding_note?: string;
  age_band_notes?: string;
  equipment_needed?: string[];
};
type Bundle = { version: number; guides: Guide[] };

export function SessionGuide() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [flagPlayers, setFlagPlayers] = useState<{ name: string; rationale: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const [{ data: s }, { data: auth }, guidesRes] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', id).single(),
        supabase.auth.getUser(),
        fetch('/facilitation-guides.json'),
      ]);
      setSession(s ?? null);

      if (s && guidesRes.ok) {
        const bundle = (await guidesRes.json()) as Bundle;
        const match = bundle.guides.find(
          (g) => g.week_number === s.week_number && g.age_band === s.age_band,
        );
        setGuide(match ?? null);
      }

      if (auth.user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('squad_id')
          .eq('user_id', auth.user.id)
          .eq('role', 'coach');
        const squadIds = roles?.map((r) => r.squad_id).filter(Boolean) ?? [];
        if (squadIds.length) {
          const { data: members } = await supabase
            .from('squad_members')
            .select('player_id, players(first_name, last_initial)')
            .in('squad_id', squadIds);
          const playerIds = members?.map((m) => m.player_id) ?? [];
          if (playerIds.length) {
            const { data: signals } = await supabase
              .from('wellbeing_signals')
              .select('player_id, rationale, signal_type, status')
              .in('player_id', playerIds)
              .eq('status', 'new')
              .eq('signal_type', 'flag');
            const nameOf = new Map<string, string>();
            members?.forEach((m) => {
              // @ts-expect-error nested
              nameOf.set(m.player_id, `${m.players?.first_name ?? ''} ${m.players?.last_initial ?? ''}`.trim());
            });
            setFlagPlayers(
              signals?.map((s2) => ({ name: nameOf.get(s2.player_id) ?? 'Player', rationale: s2.rationale })) ?? [],
            );
          }
        }
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div style={{ padding: 24 }}><p className="eyebrow">Loading…</p></div>;
  if (!session) return <div style={{ padding: 24 }}><p>Session not found.</p></div>;

  const renderDo = (v: string | string[]) => (
    Array.isArray(v) ? (
      <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: 12, color: 'var(--ink)', lineHeight: 1.6 }}>
        {v.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    ) : (
      <p style={{ fontSize: 12, color: 'var(--ink)', margin: '6px 0 0', lineHeight: 1.5 }}>{v}</p>
    )
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <div>
          <p className="eyebrow">Session guide · week {session.week_number}</p>
          <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--navy-900)' }}>
            {session.title}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-muted)' }}>
            {guide?.total_minutes ?? session.duration_min} min · {session.age_band.replace('age_', '').replace('_', '–')}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => nav(-1)}>Back</button>
      </header>

      {!guide ? (
        <section className="card" style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            Facilitation guide not yet written for this session. Use the video + your own structure for now.
          </p>
        </section>
      ) : (
        <>
          {guide.equipment_needed?.length ? (
            <section className="card" style={{ marginTop: 16 }}>
              <p className="eyebrow">Equipment</p>
              <p style={{ marginTop: 6, fontSize: 12, color: 'var(--ink)' }}>
                {guide.equipment_needed.join(' · ')}
              </p>
            </section>
          ) : null}

          {guide.parts.map((p, i) => (
            <section key={i} className="card" style={{ marginTop: 12 }}>
              <p className="eyebrow">Part {i + 1} · {p.name.toLowerCase()} · {p.duration_min} min</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, marginTop: 6, color: 'var(--navy-900)' }}>
                What to do
              </p>
              {renderDo(p.what_to_do)}
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, marginTop: 10, color: 'var(--navy-900)' }}>
                What to say
              </p>
              <p style={{ marginTop: 4, fontSize: 12, color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.5 }}>
                "{p.what_to_say}"
              </p>
            </section>
          ))}

          {guide.safeguarding_note && (
            <section className="card" style={{ marginTop: 12, background: 'var(--gold-100)', borderColor: 'var(--gold-500)' }}>
              <p className="eyebrow">Safeguarding</p>
              <p style={{ marginTop: 6, fontSize: 12, color: 'var(--ink)' }}>{guide.safeguarding_note}</p>
            </section>
          )}

          {guide.age_band_notes && (
            <section className="card" style={{ marginTop: 12 }}>
              <p className="eyebrow">Age-band note</p>
              <p style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-muted)' }}>{guide.age_band_notes}</p>
            </section>
          )}
        </>
      )}

      {flagPlayers.length > 0 && (
        <section className="card" style={{ marginTop: 12, background: '#fdecec', borderColor: 'var(--alert)' }}>
          <p className="eyebrow">Open flags on your squad</p>
          {flagPlayers.map((f) => (
            <p key={f.name} style={{ fontSize: 12, marginTop: 6 }}>
              <b>{f.name}</b> — {f.rationale}. Consider a quiet 1:1 after the drill.
            </p>
          ))}
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => nav('/signals')}>
            Open signals →
          </button>
        </section>
      )}
    </div>
  );
}
