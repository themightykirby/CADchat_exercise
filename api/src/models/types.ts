
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface Review {
  id: string;
  cube_id: string;
  comment: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}
