import { useState } from 'react';
import { useAuth } from '@tpm/auth';

export function SignIn() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail(email.trim());
    setSent(true);
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 32, textAlign: 'center' }}>
      <div className="tpm-mark" style={{ width: 68, height: 68, fontSize: 24, borderRadius: 16, margin: '0 auto' }}>TPM</div>
      <h1 style={{ marginTop: 20 }}>Sign in — Coach app</h1>
      <p style={{ color: 'var(--ink-muted)', marginTop: 8 }}>Magic link. No passwords.</p>
      {sent ? (
        <div className="card" style={{ marginTop: 16, background: 'var(--gold-100)' }}>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--gold-800)' }}>Check your email and tap the link.</p>
        </div>
      ) : (
        <form onSubmit={handle} style={{ marginTop: 16 }}>
          <input className="input" type="email" required placeholder="coach@yourclub.co.uk" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-primary" type="submit" style={{ marginTop: 12, width: '100%' }}>Send link →</button>
        </form>
      )}
    </div>
  );
}
