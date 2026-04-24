import { createTpmClient } from '@tpm/supabase';

export const supabase = createTpmClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
