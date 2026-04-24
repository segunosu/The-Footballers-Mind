// Minimal Database types for v1. Auto-generated types via
// `supabase gen types typescript --linked --schema tpm` should replace this
// file once the project has pnpm install + supabase CLI set up locally.

export type UserRole =
  | 'super_admin'
  | 'club_admin'
  | 'coach'
  | 'parent'
  | 'player';

export type AgeBand = 'age_7_9' | 'age_10_12' | 'age_13_14';

export type ConsentType =
  | 'app_use'
  | 'coach_patterns'
  | 'digest_email'
  | 'research_data'
  | 'marketing_updates';

export type MoodCode = 'calm' | 'ready' | 'heavy' | 'buzzing';

export type SessionStatus = 'not_started' | 'in_progress' | 'complete';

export interface Club {
  id: string;
  name: string;
  slug: string;
  crest_url: string | null;
  brand_primary: string | null;
  region: string;
  created_at: string;
  updated_at: string;
}

export interface Squad {
  id: string;
  club_id: string;
  name: string;
  age_band: AgeBand;
  primary_coach_id: string | null;
  season: string | null;
}

export interface Player {
  id: string;
  profile_id: string | null;
  first_name: string;
  last_initial: string | null;
  date_of_birth: string;
  age_band: AgeBand;
  has_own_login: boolean;
}

export interface Session {
  id: string;
  phase_id: number;
  week_number: number;
  age_band: AgeBand;
  title: string;
  subtitle: string | null;
  duration_min: number;
  outcome_promise: string;
  evidence_refs: unknown[];
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'retired';
}

export interface Database {
  tpm: {
    Tables: {
      clubs: { Row: Club; Insert: Partial<Club>; Update: Partial<Club> };
      squads: { Row: Squad; Insert: Partial<Squad>; Update: Partial<Squad> };
      players: { Row: Player; Insert: Partial<Player>; Update: Partial<Player> };
      sessions: { Row: Session; Insert: Partial<Session>; Update: Partial<Session> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      age_band: AgeBand;
      consent_type: ConsentType;
      mood_code: MoodCode;
      session_status: SessionStatus;
    };
  };
}
