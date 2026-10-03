import { useEffect, useRef, useState } from 'react'
import { deleteReview, updateReviewStatus } from '../api/client'
import type { Review, ReviewStatus } from '../api/types'

interface ReviewListProps {
  reviews: Review[]
  onDecided: (review: Review) => void
  onDeleted: (id: string) => void
  onError: (error: unknown) => void
}

const STATUS_CLASS: Record<ReviewStatus, string> = {
  pending: 'text-gray-600',
  approved: 'text-green-700',
  rejected: 'text-red-700',
}

export function ReviewList({ reviews, onDecided, onDeleted, onError }: ReviewListProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const previousCount = useRef(reviews.length)

  useEffect(() => {
    if (reviews.length > previousCount.current) {
      const list = listRef.current
      list?.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
    }
    previousCount.current = reviews.length
  }, [reviews.length])

  if (reviews.length === 0) {
    return null
  }

  return (
    <ul
      ref={listRef}
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1"
    >
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          onDecided={onDecided}
          onDeleted={onDeleted}
          onError={onError}
        />
      ))}
    </ul>
  )
}

interface ReviewItemProps {
  review: Review
  onDecided: (review: Review) => void
  onDeleted: (id: string) => void
  onError: (error: unknown) => void
}

function ReviewItem({ review, onDecided, onDeleted, onError }: ReviewItemProps) {
  const [deciding, setDeciding] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function decide(status: 'approved' | 'rejected') {
    if (deciding) return
    setDeciding(true)
    try {
      onDecided(await updateReviewStatus(review.id, status))
    } catch (error) {
      onError(error)
    } finally {
      setDeciding(false)
    }
  }

  async function remove() {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteReview(review.id)
      onDeleted(review.id)
    } catch (error) {
      onError(error)
      setDeleting(false)
    }
  }

  return (
    <li className="relative flex shrink-0 flex-col gap-0.5 rounded border border-panel-border bg-gray-200 p-1.5">
      <button
        type="button"
        disabled={deleting || deciding}
        onClick={remove}
        aria-label="Delete comment"
        title="Delete comment"
        className="absolute top-0.5 right-0.5 flex size-6 cursor-pointer items-center justify-center rounded text-sm leading-none text-gray-600 focus-visible:outline-2 focus-visible:outline-primary enabled:hover:bg-gray-300 enabled:hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        x
      </button>
      <p className="pr-6 text-sm text-gray-900 select-text">{review.comment}</p>
      <p className={`text-xs font-medium capitalize ${STATUS_CLASS[review.status]}`}>
        {review.status}
      </p>
      {review.status === 'pending' && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={deciding || deleting}
            onClick={() => decide('approved')}
            className="cursor-pointer rounded bg-approve px-3 py-1 text-sm text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-approve disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={deciding || deleting}
            onClick={() => decide('rejected')}
            className="cursor-pointer rounded bg-reject px-3 py-1 text-sm text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-reject disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </li>
  )
}
