import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { asReview, asReviews } from './supabase.ts';
import { HttpError } from '../lib/errors.ts';
import { logError } from '../lib/logger.ts';
import type { Review, ReviewStatus } from '../models/types.ts';

function dbFailure(action: string, error: PostgrestError): HttpError {
  logError(`database error during ${action}`, error, { code: error.code }, false);
  return new HttpError(500, 'Internal server error');
}

export interface ReviewsRepo {
  create(input: { cube_id: string; comment: string }): Promise<Review>;
  getById(id: string): Promise<Review | null>;
  listByCube(cubeId: string): Promise<Review[]>;
  updateStatus(id: string, status: Exclude<ReviewStatus, 'pending'>): Promise<Review>;
  remove(id: string): Promise<void>;
}

export function createReviewsRepo(client: SupabaseClient): ReviewsRepo {
  return {
    async create(input) {
      const { data, error } = await client.rpc('replace_review', {
        p_cube_id: input.cube_id,
        p_comment: input.comment,
      });
      if (error) throw dbFailure('create', error);
      return asReview(data);
    },

    async getById(id) {
      const { data, error } = await client.from('reviews').select().eq('id', id).maybeSingle();
      if (error) throw dbFailure('getById', error);
      return data ? asReview(data) : null;
    },

    async listByCube(cubeId) {
      const { data, error } = await client
        .from('reviews')
        .select()
        .eq('cube_id', cubeId)
        .order('created_at', { ascending: false });
      if (error) throw dbFailure('listByCube', error);
      return asReviews(data);
    },

    async updateStatus(id, status) {
      const { data, error } = await client
        .from('reviews')
        .update({ status })
        .eq('id', id)
        .eq('status', 'pending')
        .select()
        .maybeSingle();
      if (error) throw dbFailure('updateStatus', error);
      if (data) return asReview(data);

      const existing = await this.getById(id);
      if (!existing) throw new HttpError(404, 'Review not found');
      throw new HttpError(409, `Review is already ${existing.status}`);
    },

    async remove(id) {
      const { data, error } = await client.from('reviews').delete().eq('id', id).select('id');
      if (error) throw dbFailure('remove', error);
      if (!data || data.length === 0) throw new HttpError(404, 'Review not found');
    },
  };
}
