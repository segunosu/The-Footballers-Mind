import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@tpm/auth';
import { supabase } from '../lib/supabase';

const DEMO = { email: 'parent.morganjones@example.com', password: 'DemoTPM2026!' };

export function SignIn() {
  const nav = useNavigate();
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState(false);

  const doSignIn = async (em: string, pw: string) => {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    nav('/', { replace: true });
  };
  const handlePassword = (e: React.FormEvent) => { e.preventDefault(); doSignIn(email.trim(), password); };
  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setErr('Enter your email first'); return; }
    const { error } = await signInWithEmail(email.trim());
    if (error) setErr(error); else setSentLink(true);
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 32, textAlign: 'center' }}>
      <div className="tpm-mark" style={{ width: 68, height: 68, fontSize: 24, borderRadius: 16, margin: '0 auto' }}>TPM</div>
      <h1 style={{ marginTop: 20 }}>Parent app</h1>
      <p style={{ color: 'var(--ink-muted)', marginTop: 8, fontSize: 13 }}>Pick the demo account or sign in.</p>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={() => doSignIn(DEMO.email, DEMO.password)} disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in as James (parent of Morgan)'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
        <label style={{ fontSize: 11, color: 'var(--ink-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Email</label>
        <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label style={{ fontSize: 11, color: 'var(--ink-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Password</label>
        <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p style={{ color: 'var(--alert)', fontSize: 12, margin: 0 }}>{err}</p>}
        <button className="btn btn-secondary" type="submit" disabled={busy || !email || !password}>Sign in with password</button>
      </form>
      {sentLink ? (
        <p style={{ fontSize: 12, color: 'var(--pitch)', fontWeight: 700, marginTop: 12 }}>Magic link sent — check your email.</p>
      ) : (
        <a href="#" onClick={handleMagic} style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: 'var(--ink-muted)' }}>Or email me a magic link instead →</a>
      )}
      <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 16 }}>
        Demo password: <code style={{ background: 'var(--gold-100)', color: 'var(--navy-900)', padding: '2px 6px', borderRadius: 4 }}>DemoTPM2026!</code>
      </p>
    </div>
  );
}
