import { Routes, Route, Navigate, HashRouter, NavLink } from 'react-router-dom';
import { AuthProvider, RequireAuth, SignOutButton } from '@tpm/auth';
import { supabase } from './lib/supabase';
import { Home } from './pages/Home';
import { Join } from './pages/Join';
import { SignIn } from './pages/SignIn';
import { SessionPlayer } from './pages/SessionPlayer';
import { CheckIn } from './pages/CheckIn';
import { Progress } from './pages/Progress';

function Nav() {
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
    <nav style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid var(--line)', display: 'flex', maxWidth: 420, margin: '0 auto', zIndex: 10 }}>
      {link('/', 'Home', true)}
      {link('/progress', 'Progress')}
    </nav>
  );
}

function Guarded({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth fallback={<Navigate to="/signin" replace />}>
      <SignOutButton />
      {children}
      <Nav />
    </RequireAuth>
  );
}

export function App() {
  return (
    <AuthProvider client={supabase}>
      <HashRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/join" element={<Join />} />
          <Route path="/" element={<Guarded><Home /></Guarded>} />
          <Route path="/progress" element={<Guarded><Progress /></Guarded>} />
          <Route path="/session/:id" element={<Guarded><SessionPlayer /></Guarded>} />
          <Route path="/checkin" element={<Guarded><CheckIn /></Guarded>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
