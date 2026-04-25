import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, RequireAuth, SignOutButton } from '@tpm/auth';
import { supabase } from './lib/supabase';
import { SignIn } from './pages/SignIn';
import { Squad } from './pages/Squad';
import { Signals } from './pages/Signals';
import { SessionGuide } from './pages/SessionGuide';
import { InviteParents } from './pages/InviteParents';
import { AdminOverview } from './pages/admin/Overview';
import { AdminSquads } from './pages/admin/Squads';
import { AdminCoaches } from './pages/admin/Coaches';
import { AdminConsents } from './pages/admin/Consents';
import { AdminDataExport } from './pages/admin/DataExport';
import { useRoles } from './hooks/useRoles';

function Shell({ children }: { children: React.ReactNode }) {
  const { isClubAdmin } = useRoles();
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
        fontSize: 12,
      })}
    >
      {label}
    </NavLink>
  );
  return (
    <>
      {children}
      <nav
        style={{
          position: 'sticky',
          bottom: 0,
          background: '#fff',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          maxWidth: 480,
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        {link('/', 'Squad', true)}
        {link('/signals', 'Signals')}
        {link('/invite', 'Invite')}
        {isClubAdmin && link('/admin', 'Admin')}
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
          <Route path="/" element={<Guarded><Squad /></Guarded>} />
          <Route path="/signals" element={<Guarded><Signals /></Guarded>} />
          <Route path="/invite" element={<Guarded><InviteParents /></Guarded>} />
          <Route path="/session/:id" element={<Guarded><SessionGuide /></Guarded>} />
          <Route path="/admin" element={<Guarded><AdminOverview /></Guarded>} />
          <Route path="/admin/squads" element={<Guarded><AdminSquads /></Guarded>} />
          <Route path="/admin/coaches" element={<Guarded><AdminCoaches /></Guarded>} />
          <Route path="/admin/consents" element={<Guarded><AdminConsents /></Guarded>} />
          <Route path="/admin/data" element={<Guarded><AdminDataExport /></Guarded>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
