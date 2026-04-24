// ElevenLabs text-to-speech client. Renders 60-second narration tracks that
// get paired with the HeyGen (muted) video.

import type { Config } from './config';

const ELEVEN_API = 'https://api.elevenlabs.io/v1/text-to-speech';

export async function synthesiseVoice(
  cfg: Config,
  text: string,
): Promise<ArrayBuffer> {
  if (!cfg.elevenlabs.key || !cfg.elevenlabs.voiceId) {
    throw new Error('ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID required for live render');
  }
  const res = await fetch(`${ELEVEN_API}/${cfg.elevenlabs.voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': cfg.elevenlabs.key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.2 },
      output_format: 'mp3_44100_128',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs API ${res.status}: ${body}`);
  }
  return await res.arrayBuffer();
}
