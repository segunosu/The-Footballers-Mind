import { HashRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, RequireAuth, SignOutButton } from '@tpm/auth';
import { supabase } from './lib/supabase';
import { SignIn } from './pages/SignIn';
import { Digest } from './pages/Digest';
import { ChildProgress } from './pages/ChildProgress';
import { Starters } from './pages/Starters';
import { Settings } from './pages/Settings';
import { InviteRedeem } from './pages/InviteRedeem';

function Shell({ children }: { children: React.ReactNode }) {
  const link = (to: string, label: string, end?: boolean) => (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        flex: 1,
        textAlign: 'center',
        fontWeight: 700,
        color: isActive ? 'var(--navy-900)' : 'var(--ink-muted)',
        textDecoration: 'none',
        padding: '10px 0',
      })}
    >
      {label}
    </NavLink>
  );
  return (
    <>
      {children}
      <nav style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid var(--line)', display: 'flex', maxWidth: 480, margin: '0 auto', zIndex: 10 }}>
        {link('/', 'Digest', true)}
        {link('/child', 'Progress')}
        {link('/talk', 'Talk')}
        {link('/settings', 'Settings')}
      </nav>
    </>
  );
}

function Guarded({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth fallback={<Navigate to="/signin" replace />}>
      <SignOutButton />
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}

export function App() {
  return (
    <AuthProvider client={supabase}>
      <HashRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/invite/:token" element={<InviteRedeem />} />
          <Route path="/invite" element={<InviteRedeem />} />
          <Route path="/" element={<Guarded><Digest /></Guarded>} />
          <Route path="/child" element={<Guarded><ChildProgress /></Guarded>} />
          <Route path="/talk" element={<Guarded><Starters /></Guarded>} />
          <Route path="/settings" element={<Guarded><Settings /></Guarded>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
