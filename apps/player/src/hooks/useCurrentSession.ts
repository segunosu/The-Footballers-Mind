// Resolves "this week's session" for the logged-in player.
// v1 logic: find the player record linked to the auth user's profile,
// look up an in_progress session first, else the earliest not_started
// published session that matches the player's age band.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, Player } from '@tpm/supabase';

export type CurrentSession = {
  loading: boolean;
  player: Player | null;
  session: Session | null;
  weekNumber: number | null;
  error: string | null;
};

export function useCurrentSession(): CurrentSession {
  const [state, setState] = useState<CurrentSession>({
    loading: true,
    player: null,
    session: null,
    weekNumber: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (!cancelled) setState({ loading: false, player: null, session: null, weekNumber: null, error: null });
        return;
      }

      const { data: players, error: pErr } = await supabase
        .from('players')
        .select('*')
        .eq('profile_id', auth.user.id)
        .limit(1);
      if (pErr || !players?.length) {
        if (!cancelled) setState({ loading: false, player: null, session: null, weekNumber: null, error: pErr?.message ?? null });
        return;
      }
      const player = players[0];

      // Try in-progress session first
      const { data: inProgress } = await supabase
        .from('session_progress')
        .select('session_id, status')
        .eq('player_id', player.id)
        .eq('status', 'in_progress')
        .limit(1);

      let sessionId = inProgress?.[0]?.session_id ?? null;

      if (!sessionId) {
        // Earliest not-started, published session for this age band
        const { data: sessions } = await supabase
          .from('sessions')
          .select('*')
          .eq('age_band', player.age_band)
          .eq('status', 'published')
          .order('week_number', { ascending: true })
          .limit(1);
        if (sessions?.length) sessionId = sessions[0].id;
      }

      if (!sessionId) {
        if (!cancelled) setState({ loading: false, player, session: null, weekNumber: null, error: null });
        return;
      }

      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!cancelled) {
        setState({
          loading: false,
          player,
          session: session ?? null,
          weekNumber: session?.week_number ?? null,
          error: null,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
