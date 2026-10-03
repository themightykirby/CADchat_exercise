import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Config } from '../config/index.ts';
import type { Review } from '../models/types.ts';

export function createSupabaseClient(
  config: Config,
  auth: { autoRefreshToken?: boolean } = {},
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { persistSession: false, ...auth },
  });
}

export function asReview(row: unknown): Review {
  return row as Review;
}

export function asReviews(rows: unknown): Review[] {
  return rows as Review[];
}
