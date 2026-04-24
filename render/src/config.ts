// Render harness config. Reads from env; falls back to dry-run when keys absent.

export type Mode = 'plan' | 'dry' | 'live';

export type Config = {
  mode: Mode;
  heygen: { key: string | null; avatarId: string | null; voiceId: string | null };
  elevenlabs: { key: string | null; voiceId: string | null };
  supabase: { url: string; serviceRoleKey: string | null };
};

export function loadConfig(mode: Mode = 'dry'): Config {
  return {
    mode,
    heygen: {
      key: process.env.HEYGEN_API_KEY || null,
      avatarId: process.env.HEYGEN_AVATAR_ID || null,
      voiceId: process.env.HEYGEN_VOICE_ID || null,
    },
    elevenlabs: {
      key: process.env.ELEVENLABS_API_KEY || null,
      voiceId: process.env.ELEVENLABS_VOICE_ID || null,
    },
    supabase: {
      url: process.env.SUPABASE_URL || 'https://kpsxdpxehorbjzgkkjqy.supabase.co',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    },
  };
}

export function assertLiveReady(cfg: Config): string[] {
  const missing: string[] = [];
  if (!cfg.heygen.key) missing.push('HEYGEN_API_KEY');
  if (!cfg.heygen.avatarId) missing.push('HEYGEN_AVATAR_ID');
  if (!cfg.elevenlabs.key) missing.push('ELEVENLABS_API_KEY');
  if (!cfg.elevenlabs.voiceId) missing.push('ELEVENLABS_VOICE_ID');
  if (!cfg.supabase.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return missing;
}
