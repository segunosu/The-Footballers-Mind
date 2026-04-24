import { useCurrentSession } from '../hooks/useCurrentSession';
import { AGE_BAND_LABEL } from '@tpm/design-system';

export function Home() {
  const { loading, player, session } = useCurrentSession();

  if (loading) return <div className="app-shell"><p className="eyebrow">Loading…</p></div>;
  if (!player) return <div className="app-shell"><p>No player profile linked to this account yet. Ask your parent for the join code.</p></div>;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="club-mark">
          <div className="crest">UFC</div>
          <div>
            <p className="club-name">Unity FC Academy</p>
            <p className="club-role">U10 Reds · {player.first_name}</p>
          </div>
        </div>
        <div className="tpm-mark">TPM</div>
      </header>

      {session ? (
        <>
          <section className="hero">
            <p className="eyebrow">This week · Week {session.week_number}</p>
            <h1 style={{ fontSize: 'var(--text-xxl)', marginTop: 4 }}>{session.title}</h1>
            <p style={{ marginTop: 12, color: '#c6d0e4', fontSize: 'var(--text-sm)' }}>
              {session.outcome_promise}
            </p>
            <div style={{ marginTop: 16 }}>
              <a className="btn btn-primary" href={`/session/${session.id}`}>Start session →</a>
            </div>
          </section>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
            <span className="chip">{AGE_BAND_LABEL[player.age_band]}</span>
            <span className="chip chip-gold">Phase 1 · Foundation</span>
          </div>
        </>
      ) : (
        <div className="card"><p>No sessions published yet for your age band. Your coach will let you know when the first one is ready.</p></div>
      )}
    </div>
  );
}
