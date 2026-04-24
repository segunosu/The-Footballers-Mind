// Reads the current user's TPM roles. Cached per session.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '@tpm/supabase';

export type RolesState = {
  loading: boolean;
  roles: UserRole[];
  clubIds: string[];
  squadIds: string[];
  isClubAdmin: boolean;
  isCoach: boolean;
};

const EMPTY: RolesState = {
  loading: true,
  roles: [],
  clubIds: [],
  squadIds: [],
  isClubAdmin: false,
  isCoach: false,
};

export function useRoles(): RolesState {
  const [state, setState] = useState<RolesState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (!cancelled) setState({ ...EMPTY, loading: false });
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role, club_id, squad_id')
        .eq('user_id', auth.user.id);

      const roles = Array.from(new Set((data ?? []).map((r) => r.role as UserRole)));
      const clubIds = Array.from(new Set((data ?? []).map((r) => r.club_id).filter(Boolean) as string[]));
      const squadIds = Array.from(new Set((data ?? []).map((r) => r.squad_id).filter(Boolean) as string[]));
      if (!cancelled) {
        setState({
          loading: false,
          roles,
          clubIds,
          squadIds,
          isClubAdmin: roles.includes('club_admin'),
          isCoach: roles.includes('coach'),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
