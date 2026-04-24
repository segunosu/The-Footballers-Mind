import { useState } from 'react';
import { useAuth } from '@tpm/auth';

export function SignIn() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const { error } = await signInWithEmail(email.trim());
    if (error) setErr(error);
    else setSent(true);
  };

  return (
    <div className="app-shell">
      <div className="center-stack">
        <div className="tpm-mark" style={{ width: 68, height: 68, fontSize: 24, borderRadius: 16 }}>TPM</div>
        <h1>Welcome back.</h1>
        <p style={{ color: 'var(--ink)', maxWidth: 300 }}>
          We'll email you a link to sign in. No password needed.
        </p>
        {sent ? (
          <div className="card" style={{ background: 'var(--gold-100)', borderColor: 'var(--gold-500)' }}>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--gold-800)' }}>
              Check your email. Tap the link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {err && <p style={{ color: 'var(--alert)', fontSize: 12, margin: 0 }}>{err}</p>}
            <button className="btn btn-primary" type="submit">Send link →</button>
          </form>
        )}
      </div>
    </div>
  );
}
