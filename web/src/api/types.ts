
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface Review {
  id: string
  cube_id: string
  comment: string
  status: ReviewStatus
  created_at: string
  updated_at: string
}

export interface CreateReviewBody {
  cube_id: string
  comment: string
}

export interface PatchReviewBody {
  status: Exclude<ReviewStatus, 'pending'>
}
