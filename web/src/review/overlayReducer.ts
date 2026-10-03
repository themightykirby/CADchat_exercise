import type { Review, ReviewStatus } from '../api/types'

export type OverlayState =
  | { kind: 'closed' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; reviews: Review[]; notice: string | null }

export type OverlayAction =
  | { type: 'openStarted' }
  | { type: 'loaded'; reviews: Review[] }
  | { type: 'created'; review: Review }
  | { type: 'decided'; review: Review }
  | { type: 'deleted'; id: string }
  | { type: 'failed'; message: string }
  | { type: 'noticeShown'; message: string }
  | { type: 'closed' }

export const closedOverlayState: OverlayState = { kind: 'closed' }

export type CubeStatus = ReviewStatus | 'none'

export function aggregateStatus(reviews: Review[]): CubeStatus {
  if (reviews.length === 0) return 'none'
  if (reviews.some((review) => review.status === 'pending')) return 'pending'
  if (reviews.some((review) => review.status === 'rejected')) return 'rejected'
  return 'approved'
}

export function overlayReducer(
  state: OverlayState,
  action: OverlayAction,
): OverlayState {
  switch (action.type) {
    case 'openStarted':
      return { kind: 'loading' }
    case 'loaded':
      if (state.kind === 'closed') return state
      return { kind: 'ready', reviews: action.reviews, notice: null }
    case 'failed':
      if (state.kind === 'closed') return state
      return { kind: 'error', message: action.message }
    case 'created':
      if (state.kind !== 'ready') return state
      return { kind: 'ready', reviews: [...state.reviews, action.review], notice: null }
    case 'decided':
      if (state.kind !== 'ready') return state
      return {
        kind: 'ready',
        reviews: state.reviews.map((review) =>
          review.id === action.review.id ? action.review : review,
        ),
        notice: null,
      }
    case 'deleted':
      if (state.kind !== 'ready') return state
      return {
        kind: 'ready',
        reviews: state.reviews.filter((review) => review.id !== action.id),
        notice: null,
      }
    case 'noticeShown':
      if (state.kind !== 'ready') return state
      return { ...state, notice: action.message }
    case 'closed':
      return { kind: 'closed' }
    default:
      return state
  }
}
