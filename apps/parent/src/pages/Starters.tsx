// Conversation starters for parents — contextual by time-of-week and
// evidence-cited. v1 uses a static deck; v2 will personalise by child's
// current week.

const STARTERS: { context: string; line: string }[] = [
  { context: 'After training · Thursday', line: '"What\'s one thing that worked and one thing that didn\'t, today?"' },
  { context: 'Before a match',            line: '"What\'s your two-second reset?"' },
  { context: 'After a mistake',           line: '"It\'s done. What\'s the next play?"' },
  { context: 'Evening wind-down',         line: '"Show me your calm face." (Really.)' },
  { context: 'Saturday morning',          line: '"One thing you want to get better at today?"' },
  { context: 'Sunday night',              line: '"What\'s one win from this week?"' },
];

export function Starters() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
          Talk about today
        </p>
        <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20 }}>
          Dinner-table starters
        </p>
      </header>

      <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
        {STARTERS.map((s) => (
          <div key={s.line} className="card">
            <p style={{ margin: 0, fontSize: 10, color: 'var(--gold-600)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              {s.context}
            </p>
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--navy-900)', lineHeight: 1.4 }}>
              {s.line}
            </p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, background: 'var(--navy-100)', border: 0 }}>
        <p className="eyebrow">Why these?</p>
        <p style={{ fontSize: 12, color: 'var(--ink)', marginTop: 6, lineHeight: 1.5 }}>
          Open questions outperform "did you have a good day?" by roughly 3× for
          emotional disclosure in children (Harwood &amp; Knight, 2009).
        </p>
      </div>
    </div>
  );
}
