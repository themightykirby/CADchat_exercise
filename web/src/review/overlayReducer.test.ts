import { describe, expect, it } from 'vitest'
import type { Review, ReviewStatus } from '../api/types'
import {
  aggregateStatus,
  closedOverlayState,
  overlayReducer,
} from './overlayReducer'
import type { OverlayState } from './overlayReducer'

function makeReview(id: string, status: ReviewStatus = 'pending'): Review {
  return {
    id,
    cube_id: 'cube-1',
    comment: `Comment ${id}`,
    status,
    created_at: '2026-10-02T00:00:00Z',
    updated_at: '2026-10-02T00:00:00Z',
  }
}

const first = makeReview('r1')
const second = makeReview('r2')

function ready(reviews: Review[], notice: string | null = null): OverlayState {
  return { kind: 'ready', reviews, notice }
}

describe('overlayReducer', () => {
  it('starts closed', () => {
    expect(closedOverlayState).toEqual({ kind: 'closed' })
  })

  it('shows loading when an open starts', () => {
    expect(overlayReducer(closedOverlayState, { type: 'openStarted' })).toEqual({
      kind: 'loading',
    })
  })

  it('becomes ready with the loaded reviews', () => {
    expect(
      overlayReducer({ kind: 'loading' }, { type: 'loaded', reviews: [first, second] }),
    ).toEqual(ready([first, second]))
  })

  it('is ready with an empty list when the cube has no reviews', () => {
    expect(overlayReducer({ kind: 'loading' }, { type: 'loaded', reviews: [] })).toEqual(
      ready([]),
    )
  })

  it('replaces stale data when reopened and reloaded', () => {
    const stale = ready([first])
    const reloading = overlayReducer(stale, { type: 'openStarted' })
    expect(reloading).toEqual({ kind: 'loading' })
    expect(overlayReducer(reloading, { type: 'loaded', reviews: [first, second] })).toEqual(
      ready([first, second]),
    )
  })

  it('ignores a late load result after the overlay was closed', () => {
    expect(overlayReducer(closedOverlayState, { type: 'loaded', reviews: [first] })).toBe(
      closedOverlayState,
    )
  })

  it('ignores a late load failure after the overlay was closed', () => {
    expect(overlayReducer(closedOverlayState, { type: 'failed', message: 'boom' })).toBe(
      closedOverlayState,
    )
  })

  it('moves to error when a load fails', () => {
    expect(overlayReducer({ kind: 'loading' }, { type: 'failed', message: 'boom' })).toEqual({
      kind: 'error',
      message: 'boom',
    })
  })

  it('appends a created review and clears the notice', () => {
    expect(
      overlayReducer(ready([first], 'old'), { type: 'created', review: second }),
    ).toEqual(ready([first, second]))
  })

  it('ignores created when not ready', () => {
    const loading: OverlayState = { kind: 'loading' }
    expect(overlayReducer(loading, { type: 'created', review: first })).toBe(loading)
  })

  it('replaces a decided review by id and keeps the order', () => {
    const approved = makeReview('r1', 'approved')
    expect(
      overlayReducer(ready([first, second]), { type: 'decided', review: approved }),
    ).toEqual(ready([approved, second]))
  })

  it('removes a deleted review by id and clears the notice', () => {
    expect(
      overlayReducer(ready([first, second], 'old'), { type: 'deleted', id: 'r1' }),
    ).toEqual(ready([second]))
  })

  it('ignores deleted when not ready', () => {
    expect(overlayReducer(closedOverlayState, { type: 'deleted', id: 'r1' })).toBe(
      closedOverlayState,
    )
  })

  it('ignores decided when not ready', () => {
    expect(
      overlayReducer(closedOverlayState, { type: 'decided', review: first }),
    ).toBe(closedOverlayState)
  })

  it('keeps the list and shows a notice when an action fails', () => {
    expect(
      overlayReducer(ready([first]), { type: 'noticeShown', message: 'Already decided' }),
    ).toEqual(ready([first], 'Already decided'))
  })

  it('ignores a notice when not ready', () => {
    const loading: OverlayState = { kind: 'loading' }
    expect(overlayReducer(loading, { type: 'noticeShown', message: 'x' })).toBe(loading)
  })

  it('closes from any state', () => {
    expect(overlayReducer(ready([first]), { type: 'closed' })).toEqual({ kind: 'closed' })
  })
})

describe('aggregateStatus', () => {
  it('is none when there are no reviews', () => {
    expect(aggregateStatus([])).toBe('none')
  })

  it('is pending if any review is pending', () => {
    expect(
      aggregateStatus([makeReview('a', 'rejected'), makeReview('b', 'pending')]),
    ).toBe('pending')
  })

  it('is rejected if none are pending and any is rejected', () => {
    expect(
      aggregateStatus([makeReview('a', 'approved'), makeReview('b', 'rejected')]),
    ).toBe('rejected')
  })

  it('is approved when all are approved', () => {
    expect(
      aggregateStatus([makeReview('a', 'approved'), makeReview('b', 'approved')]),
    ).toBe('approved')
  })
})
