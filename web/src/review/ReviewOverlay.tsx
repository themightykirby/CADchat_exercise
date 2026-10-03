import { Html } from '@react-three/drei'
import type { Dispatch, SyntheticEvent } from 'react'
import { ApiError } from '../api/client'
import { CommentForm } from './CommentForm'
import { aggregateStatus, overlayReducer } from './overlayReducer'
import type { CubeStatus, OverlayAction, OverlayState } from './overlayReducer'
import { ReviewList } from './ReviewList'

interface ReviewOverlayProps {
  cubeId: string
  state: OverlayState
  dispatch: Dispatch<OverlayAction>
  onClose: () => void
  onStatusChange?: (status: CubeStatus) => void
}

const PANEL_ANCHOR_Y = 0.9

function messageFrom(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'This comment has already been decided.'
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}

function stopEvent(event: SyntheticEvent) {
  event.stopPropagation()
}

export function ReviewOverlay({
  cubeId,
  state,
  dispatch,
  onClose,
  onStatusChange,
}: ReviewOverlayProps) {
  if (state.kind === 'closed') return null

  function apply(action: OverlayAction) {
    dispatch(action)
    const next = overlayReducer(state, action)
    if (next.kind === 'ready') onStatusChange?.(aggregateStatus(next.reviews))
  }

  function showNotice(error: unknown) {
    dispatch({ type: 'noticeShown', message: messageFrom(error) })
  }

  return (
    <Html position={[0, PANEL_ANCHOR_Y, 0]} wrapperClass="pointer-events-none">
      <div
        className="pointer-events-auto flex max-h-[min(20rem,50dvh)] w-96 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-[calc(100%+1rem)] flex-col rounded-lg border border-panel-border bg-panel p-2 text-panel-fg shadow-xl"
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onPointerUp={stopEvent}
        onWheel={stopEvent}
      >
        <div className="mb-1 flex shrink-0 items-center justify-between">
          <h2 className="text-sm font-semibold text-panel-fg">Design review</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="cursor-pointer rounded px-1 text-sm text-panel-muted hover:bg-panel-raised focus-visible:outline-2 focus-visible:outline-primary"
          >
            X
          </button>
        </div>

        {state.kind === 'loading' && <p className="text-sm text-panel-muted">Loading…</p>}

        {state.kind === 'error' && (
          <p role="alert" className="shrink-0 text-sm text-reject-fg">
            {state.message}
          </p>
        )}

        {state.kind === 'ready' && (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <ReviewList
              reviews={state.reviews.slice(0, 1)}
              onDecided={(review) => apply({ type: 'decided', review })}
              onDeleted={(id) => apply({ type: 'deleted', id })}
              onError={showNotice}
            />
            {state.notice && (
              <p role="alert" className="shrink-0 text-sm text-reject-fg">
                {state.notice}
              </p>
            )}
            {state.reviews.length === 0 && (
              <CommentForm
                cubeId={cubeId}
                onSaved={(review) => apply({ type: 'created', review })}
                onError={showNotice}
              />
            )}
          </div>
        )}
      </div>
    </Html>
  )
}
