// HeyGen Avatar IV client. v1 covers only the `generate` endpoint — which is
// all we need to render TPM sessions. Captions are hard-coded (burned in) via
// the `subtitle` config shipped Feb 2026.

import type { Config } from './config';
import type { SessionScript } from './types';

const HEYGEN_API = 'https://api.heygen.com/v2/video/generate';

export type HeyGenJob = {
  video_id: string;
  status: 'processing' | 'completed' | 'failed';
  video_url?: string;
};

export async function submitHeyGenRender(
  cfg: Config,
  s: SessionScript,
): Promise<HeyGenJob> {
  if (!cfg.heygen.key || !cfg.heygen.avatarId) {
    throw new Error('HEYGEN_API_KEY and HEYGEN_AVATAR_ID required for live render');
  }
  const res = await fetch(HEYGEN_API, {
    method: 'POST',
    headers: {
      'X-Api-Key': cfg.heygen.key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: { type: 'avatar', avatar_id: cfg.heygen.avatarId, avatar_style: 'normal' },
          voice: { type: 'silence', duration: Math.max(60, s.video.estimated_duration_sec) },
          // Captions burned into the frame — uses subtitle config from
          // HeyGen API v2 (Feb 2026 release)
          subtitle: {
            enabled: true,
            text: s.video.caption_lines.join('\n'),
            style: 'burned_in',
            font_size: 32,
            color: '#FFFFFF',
            outline_color: '#0a1f44',
            outline_width: 4,
            position: 'bottom',
          },
          background: { type: 'color', value: '#0a1f44' },
        },
      ],
      dimension: { width: 1080, height: 1920 }, // 9:16 mobile-first
      aspect_ratio: '9:16',
      test: cfg.mode !== 'live', // HeyGen supports test-mode renders that are free
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HeyGen API ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { data: HeyGenJob };
  return data.data;
}

export async function pollHeyGenStatus(cfg: Config, videoId: string): Promise<HeyGenJob> {
  if (!cfg.heygen.key) throw new Error('HEYGEN_API_KEY required');
  const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
    headers: { 'X-Api-Key': cfg.heygen.key },
  });
  const data = (await res.json()) as { data: HeyGenJob };
  return data.data;
}
