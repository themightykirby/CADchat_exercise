import { useState } from 'react'
import type { FormEvent } from 'react'
import { createReview } from '../api/client'
import type { Review } from '../api/types'

interface CommentFormProps {
  cubeId: string
  onSaved: (review: Review) => void
  onError: (error: unknown) => void
}

export function CommentForm({ cubeId, onSaved, onError }: CommentFormProps) {
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = comment.trim().length > 0 && !submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const review = await createReview({ cube_id: cubeId, comment: comment.trim() })
      onSaved(review)
    } catch (error) {
      onError(error)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex shrink-0 flex-col gap-1 border-t border-panel-border pt-2">
      <label htmlFor="review-comment" className="text-xs font-medium text-panel-fg">
        Design review comment
      </label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        className="h-14 w-full resize-none rounded border border-panel-border bg-gray-200 px-2 py-1 text-sm text-gray-900 select-text placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded bg-primary px-3 py-1 text-sm text-white enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Saving...' : 'Add comment'}
      </button>
    </form>
  )
}
