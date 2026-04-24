// Typed Supabase client for TPM. Every app imports the same factory so auth
// persistence and schema scoping stay consistent. The schema is hard-pinned to
// `tpm` so queries never leak into the shared project's `public` namespace.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type TpmClient = SupabaseClient<Database, 'tpm'>;

export function createTpmClient(url: string, anonKey: string): TpmClient {
  if (!url || !anonKey) {
    throw new Error(
      'TPM Supabase client: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set',
    );
  }
  return createClient<Database, 'tpm'>(url, anonKey, {
    db: { schema: 'tpm' },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'tpm-auth',
    },
    global: {
      headers: { 'x-client-info': 'tpm-web/0.1' },
    },
  });
}

export * from './types';
