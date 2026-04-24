// Parent invite redemption. URL shape: /invite/:token
// Flow:
//   1. If not signed in, show sign-in (magic link) with the token parked in
//      localStorage so we can resume after the email click-through.
//   2. Show the consent form with the child's details capture.
//   3. Call the tpm.redeem_parent_invite RPC — creates profile, player,
//      parent-child link, consents, and marks invite accepted in one shot.
//   4. Redirect to /digest.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '@tpm/auth';
import type { AgeBand } from '@tpm/supabase';

const TOKEN_KEY = 'tpm.pending_invite_token';

type Step = 'loading' | 'signin' | 'consent' | 'submitting' | 'done' | 'error';

export function InviteRedeem() {
  const { token: urlToken } = useParams<{ token: string }>();
  const nav = useNavigate();
  const { user, signInWithEmail } = useAuth();
  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string | null>(null);
  const [inviteClubName, setInviteClubName] = useState<string>('');
  const [email, setEmail] = useState('');
  const [sentLink, setSentLink] = useState(false);

  // Child details
  const [firstName, setFirstName] = useState('');
  const [lastInitial, setLastInitial] = useState('');
  const [dob, setDob] = useState('');
  const [ageBand, setAgeBand] = useState<AgeBand>('age_10_12');

  // Consents — app_use and coach_patterns are required; others optional
  const [cAppUse, setCAppUse] = useState(true);
  const [cCoach, setCCoach] = useState(true);
  const [cDigest, setCDigest] = useState(true);
  const [cResearch, setCResearch] = useState(false);

  const token = urlToken ?? localStorage.getItem(TOKEN_KEY) ?? '';

  useEffect(() => {
    (async () => {
      if (!token) { setStep('error'); setError('Missing invite token'); return; }

      // Look up the invite (+ club name) — this read works for anyone with
      // the token via the invites_read_by_club policy (expanded to allow
      // email-based lookup). In practice, we run the lookup as the service
      // role in a small edge function later; for v1, the parent simply
      // signs in first, then we read.
      if (!user) {
        localStorage.setItem(TOKEN_KEY, token);
        setStep('signin');
        return;
      }

      const { data } = await supabase
        .from('invites')
        .select('id, status, expires_at, club_id, clubs(name)')
        .eq('token', token)
        .maybeSingle();
      // @ts-expect-error nested
      setInviteClubName(data?.clubs?.name ?? 'your club');

      if (!data) { setStep('error'); setError('Invite not found'); return; }
      if (data.status !== 'pending') { setStep('error'); setError(`Invite ${data.status}`); return; }
      if (new Date(data.expires_at) < new Date()) { setStep('error'); setError('Invite expired'); return; }

      setStep('consent');
    })();
  }, [user, token]);

  const submitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail(email.trim());
    setSentLink(true);
  };

  const submitConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cAppUse || !cCoach) {
      setError('App use and coach pattern consents are required. Speak to your club welfare officer if you have concerns.');
      return;
    }
    setStep('submitting');
    const { error: rpcErr, data } = await supabase.rpc('redeem_parent_invite', {
      p_token: token,
      p_child_first_name: firstName.trim(),
      p_child_last_initial: lastInitial.trim() || null,
      p_child_dob: dob,
      p_child_age_band: ageBand,
      p_relationship: 'Parent',
      p_consents: {
        app_use: cAppUse,
        coach_patterns: cCoach,
        digest_email: cDigest,
        research_data: cResearch,
      },
    });
    if (rpcErr) {
      setError(rpcErr.message);
      setStep('error');
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
    setStep('done');
    setTimeout(() => nav('/'), 1200);
  };

  if (step === 'loading') return <div style={{ padding: 24 }}><p className="eyebrow">Loading invite…</p></div>;

  if (step === 'signin') {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 32, textAlign: 'center' }}>
        <div className="tpm-mark" style={{ width: 68, height: 68, fontSize: 24, borderRadius: 16, margin: '0 auto' }}>TPM</div>
        <h1 style={{ marginTop: 20 }}>Accept your invite</h1>
        <p style={{ color: 'var(--ink-muted)', marginTop: 8 }}>
          Sign in to the email address the invite was sent to. We'll email you a link — no password required.
        </p>
        {sentLink ? (
          <div className="card" style={{ marginTop: 16, background: 'var(--gold-100)' }}>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--gold-800)' }}>Check your email — tap the link to continue.</p>
          </div>
        ) : (
          <form onSubmit={submitSignIn} style={{ marginTop: 16 }}>
            <input className="input" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary" type="submit" style={{ marginTop: 12, width: '100%' }}>Send link →</button>
          </form>
        )}
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 32, textAlign: 'center' }}>
        <h1>We couldn't process this invite.</h1>
        <p style={{ color: 'var(--alert)', marginTop: 12 }}>{error}</p>
        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--ink-muted)' }}>
          Ask your club welfare officer to send a fresh invite.
        </p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 32, textAlign: 'center' }}>
        <div className="tpm-mark" style={{ width: 68, height: 68, fontSize: 24, borderRadius: 16, margin: '0 auto' }}>TPM</div>
        <h1 style={{ marginTop: 20 }}>Welcome.</h1>
        <p style={{ color: 'var(--ink-muted)', marginTop: 8 }}>Taking you to {firstName}'s digest…</p>
      </div>
    );
  }

  // step === 'consent' | 'submitting'
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <header>
        <p className="eyebrow">Invite from {inviteClubName}</p>
        <h1 style={{ marginTop: 6 }}>Consent for your child.</h1>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 8, lineHeight: 1.6 }}>
          You can change any of this later in settings. Required consents are
          marked below.
        </p>
      </header>

      <form onSubmit={submitConsent} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <div className="field">
          <label>Child's first name</label>
          <input className="input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="field">
          <label>Last initial (optional)</label>
          <input className="input" maxLength={3} value={lastInitial} onChange={(e) => setLastInitial(e.target.value)} />
        </div>
        <div className="field">
          <label>Date of birth</label>
          <input className="input" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div className="field">
          <label>Age band</label>
          <select className="select" value={ageBand} onChange={(e) => setAgeBand(e.target.value as AgeBand)}>
            <option value="age_7_9">7–9</option>
            <option value="age_10_12">10–12</option>
            <option value="age_13_14">13–14</option>
          </select>
        </div>

        <div className="card" style={{ marginTop: 4 }}>
          <p className="eyebrow">Consent</p>
          {[
            { id: 'c1', checked: cAppUse, set: setCAppUse, required: true, label: 'My child may use the Player app.', desc: 'Required. Age-appropriate sessions, no ads, no social features.' },
            { id: 'c2', checked: cCoach, set: setCCoach, required: true, label: "Coach sees my child's 14-day wellbeing patterns.", desc: 'Required. Aggregated patterns only, never single answers.' },
            { id: 'c3', checked: cDigest, set: setCDigest, required: false, label: 'Weekly digest email to me.', desc: 'Optional. Every Sunday evening. Unsubscribe any time.' },
            { id: 'c4', checked: cResearch, set: setCResearch, required: false, label: 'Contribute anonymised outcome data to research.', desc: 'Optional. Helps us improve the programme.' },
          ].map((c) => (
            <label key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={c.checked}
                onChange={(e) => c.set(e.target.checked)}
                disabled={c.required}
                style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--gold-500)' }}
              />
              <div>
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--navy-900)' }}>
                  {c.label} {c.required && <span style={{ color: 'var(--alert)', fontSize: 11 }}>(required)</span>}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ink-muted)' }}>{c.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {error && <p style={{ color: 'var(--alert)', fontSize: 12, margin: 0 }}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={step === 'submitting'}>
          {step === 'submitting' ? 'Accepting…' : `Accept & start ${firstName || 'your child'} with ${inviteClubName} →`}
        </button>
        <p style={{ fontSize: 10, color: 'var(--ink-muted)', textAlign: 'center', marginTop: 8 }}>
          UK-region data · UK GDPR · ICO Age-Appropriate Design Code · KCSIE 2024 aligned.
        </p>
      </form>
    </div>
  );
}
