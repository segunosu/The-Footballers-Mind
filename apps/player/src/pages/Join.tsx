// Invite-code entry. Club-led signup chain: club admin → coach → parent
// → this screen (the child enters the code their parent was given).

import { useState } from 'react';

export function Join() {
  const [code, setCode] = useState('U10-REDS-4HX');
  // v1: stubbed redeem handler. Real wiring queries tpm.invites by token and
  // calls Supabase auth to create a player session.
  const handleJoin = () => {
    console.info('[join] would redeem code', code);
  };

  return (
    <div className="app-shell">
      <div className="center-stack">
        <div className="tpm-mark" style={{ width: 68, height: 68, fontSize: 24, borderRadius: 16 }}>
          TPM
        </div>
        <h1>Welcome, Morgan.</h1>
        <p style={{ color: 'var(--ink)', maxWidth: 34 * 8 }}>
          Your mum signed you up with Unity FC Academy. Enter the code she gave
          you to start.
        </p>

        <div className="field" style={{ width: '100%' }}>
          <label htmlFor="join-code">Join code</label>
          <input
            id="join-code"
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleJoin}>
          Join Unity FC Academy
        </button>

        <p style={{ fontSize: 11, color: 'var(--ink-muted)', maxWidth: 34 * 8 }}>
          Your data is private. Your coach sees your progress only — nobody
          else.
        </p>
      </div>
    </div>
  );
}
