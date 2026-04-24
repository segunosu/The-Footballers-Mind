// Supabase Storage uploader. Uses service-role to write to private buckets
// that authenticated users read via signed URLs.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Config } from './config';

export function createServiceClient(cfg: Config): SupabaseClient {
  if (!cfg.supabase.serviceRoleKey)
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required for uploads');
  return createClient(cfg.supabase.url, cfg.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function uploadAsset(
  client: SupabaseClient,
  bucket: 'tpm-videos' | 'tpm-voice' | 'tpm-cards',
  path: string,
  body: ArrayBuffer | Buffer | Blob,
  contentType: string,
): Promise<string> {
  const { error } = await client.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`upload ${bucket}/${path}: ${error.message}`);
  return `${bucket}/${path}`;
}

export async function recordSessionAsset(
  client: SupabaseClient,
  sessionId: string,
  assetType: 'video' | 'voice' | 'card_pdf' | 'facilitation_guide' | 'captions',
  storagePath: string,
  durationSeconds?: number,
): Promise<void> {
  const { error } = await client.schema('tpm').from('session_assets').upsert(
    { session_id: sessionId, asset_type: assetType, storage_path: storagePath, duration_seconds: durationSeconds ?? null },
    { onConflict: 'session_id,asset_type' },
  );
  if (error) throw new Error(`record session asset: ${error.message}`);
}
