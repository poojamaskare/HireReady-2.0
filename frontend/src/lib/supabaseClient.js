import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_KEY || '';

// Required production check requested for Vercel diagnostics.
console.log('Resolved SUPABASE_URL:', SUPABASE_URL);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  : null;

export async function ensureSupabaseUser() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message || 'Failed to verify Supabase user session.');
  }
  if (!user) {
    throw new Error('Please login first.');
  }
  return user;
}

export async function getAccessibleStorageUrl(bucket, filePath, expiresIn = 3600) {
  if (!supabase) return '';

  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicData?.publicUrl || '';
}
