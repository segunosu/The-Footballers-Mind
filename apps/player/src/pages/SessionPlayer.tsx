// Session player — loads the session + its rendered video and voice assets,
// signs them, plays them, writes progress and triggers the post-session
// check-in. Graceful "coming soon" state for sessions whose media hasn't
// been rendered yet (Phase 1 before the first HeyGen batch runs).

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Session } from '@tpm/supabase';

type AssetUrls = { video?: string; voice?: string };

const SIGNED_URL_TTL_SEC = 60 * 60; // 1 hour; long enough for a sitting

async function signAsset(bucket: 'tpm-videos' | 'tpm-voice', path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error) {
    console.warn(`[session] sign ${bucket}/${path}: ${error.message}`);
    return null;
  }
  return data?.signedUrl ?? null;
}

export function SessionPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetUrls>({});
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [progressSaved, setProgressSaved] = useState(0); // last percent written to DB

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: s }, { data: auth }] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', id).single(),
        supabase.auth.getUser(),
      ]);
      setSession(s ?? null);

      // Find the player
      if (auth.user) {
        const { data: players } = await supabase
          .from('players').select('id').eq('profile_id', auth.user.id).limit(1);
        if (players?.[0]) setPlayerId(players[0].id);
      }

      // Load and sign assets
      if (s) {
        const { data: rows } = await supabase
          .from('session_assets').select('asset_type, storage_path').eq('session_id', s.id);
        const signed: AssetUrls = {};
        for (const r of rows ?? []) {
          if (r.asset_type === 'video') {
            signed.video = (await signAsset('tpm-videos', r.storage_path)) ?? undefined;
          } else if (r.asset_type === 'voice') {
            signed.voice = (await signAsset('tpm-voice', r.storage_path)) ?? undefined;
          }
        }
        setAssets(signed);

        // Mark in_progress as soon as the page opens (if not already complete)
        if (players?.[0]) {
          await supabase.from('session_progress').upsert({
            player_id: players[0].id,
            session_id: s.id,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            percent_complete: 0,
          }, { onConflict: 'player_id,session_id', ignoreDuplicates: false });
        }
      }

      setLoading(false);
    })();
  }, [id]);

  // Persist progress every ~10% advance so we don't hammer the DB
  useEffect(() => {
    if (!session || !playerId || !duration) return;
    const pct = Math.min(100, Math.round((currentTime / duration) * 100));
    if (pct - progressSaved >= 10) {
      setProgressSaved(pct);
      supabase.from('session_progress').update({
        percent_complete: pct,
        last_position_sec: Math.round(currentTime),
        updated_at: new Date().toISOString(),
      }).eq('player_id', playerId).eq('session_id', session.id);
    }
  }, [currentTime, duration, session, playerId, progressSaved]);

  const markComplete = async () => {
    if (!session || !playerId) return;
    await supabase.from('session_progress').update({
      status: 'complete',
      percent_complete: 100,
      completed_at: new Date().toISOString(),
    }).eq('player_id', playerId).eq('session_id', session.id);
    navigate('/checkin');
  };

  if (loading) return <div className="app-shell"><p className="eyebrow">Loading…</p></div>;
  if (!session) return <div className="app-shell"><p>Session not found.</p></div>;

  const mmss = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="club-mark">
          <div className="crest">UFC</div>
          <div>
            <p className="club-name">Week {session.week_number}</p>
            <p className="club-role">{session.title}</p>
          </div>
        </div>
        <div className="tpm-mark">TPM</div>
      </header>

      {/* Hero: video OR graceful coming-soon */}
      {assets.video ? (
        <section
          className="card"
          style={{ padding: 0, overflow: 'hidden', aspectRatio: '9 / 12', background: 'var(--navy-900)' }}
        >
          <video
            ref={videoRef}
            src={assets.video}
            controls
            playsInline
            preload="metadata"
            style={{ width: '100%', height: '100%', display: 'block', background: 'var(--navy-900)' }}
            onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration || 0)}
            onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
            onEnded={markComplete}
          >
            Your browser does not support video playback.
          </video>
        </section>
      ) : (
        <section className="hero" style={{ aspectRatio: '9 / 10', position: 'relative', overflow: 'hidden' }}>
          <p className="eyebrow" style={{ color: 'var(--gold-300)' }}>
            Session coming soon
          </p>
          <h2 style={{ color: '#fff', marginTop: 6, fontSize: 'var(--text-xl)' }}>{session.title}</h2>
          <p style={{ color: '#c6d0e4', marginTop: 10, fontSize: 'var(--text-sm)' }}>
            The video for this week is rendering. Your coach will let you know when it's ready.
          </p>
        </section>
      )}

      {/* Optional voice ritual — plays separately */}
      {assets.voice && (
        <section className="card" style={{ marginTop: 12 }}>
          <p className="eyebrow">Pre-match ritual · {mmss(20)}–{mmss(45)}</p>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginTop: 6, color: 'var(--navy-900)' }}>
            Your 30-second reset. Use it before the match.
          </p>
          <audio controls src={assets.voice} style={{ width: '100%', marginTop: 10 }}>
            Your browser does not support audio playback.
          </audio>
        </section>
      )}

      {/* Progress strip */}
      {duration > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--navy-100)', borderRadius: 999 }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round((currentTime / duration) * 100)}%`,
                background: 'var(--gold-500)',
                borderRadius: 999,
                transition: 'width 0.2s linear',
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 700 }}>
            {mmss(currentTime)} / {mmss(duration)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Back</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={markComplete}>
          Finish + check in →
        </button>
      </div>
    </div>
  );
}
