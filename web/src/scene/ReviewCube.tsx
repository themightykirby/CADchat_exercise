import { Float, RoundedBox, useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch } from 'react'
import { Color } from 'three'
import type { MeshStandardMaterial } from 'three'
import { getReviewsByCube } from '../api/client'
import { aggregateStatus } from '../review/overlayReducer'
import type { CubeStatus, OverlayAction, OverlayState } from '../review/overlayReducer'
import { ReviewOverlay } from '../review/ReviewOverlay'

interface ReviewCubeProps {
  cubeId: string
  overlayState: OverlayState
  dispatch: Dispatch<OverlayAction>
  onClose: () => void
}

const DRAG_THRESHOLD_PX = 3

const STATUS_COLOR: Record<CubeStatus, string> = {
  none: '#f97316',
  pending: '#eab308',
  approved: '#16a34a',
  rejected: '#dc2626',
}

export function ReviewCube({ cubeId, overlayState, dispatch, onClose }: ReviewCubeProps) {
  const [status, setStatus] = useState<CubeStatus>('none')
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useEffect(() => {
    let cancelled = false
    getReviewsByCube(cubeId)
      .then((reviews) => {
        if (!cancelled) setStatus(aggregateStatus(reviews))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [cubeId])

  async function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    if (event.delta > DRAG_THRESHOLD_PX) return
    if (overlayState.kind === 'loading') return
    dispatch({ type: 'openStarted' })
    try {
      const reviews = await getReviewsByCube(cubeId)
      setStatus(aggregateStatus(reviews))
      dispatch({ type: 'loaded', reviews })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.'
      dispatch({ type: 'failed', message })
    }
  }

  return (
    <group>
      <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.4}>
        <StatusCube
          status={status}
          hovered={hovered}
          onClick={handleClick}
          onPointerOver={(event) => {
            event.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
        />
      </Float>
      {overlayState.kind !== 'closed' && (
        <ReviewOverlay
          cubeId={cubeId}
          state={overlayState}
          dispatch={dispatch}
          onClose={onClose}
          onStatusChange={setStatus}
        />
      )}
    </group>
  )
}

interface StatusCubeProps {
  status: CubeStatus
  hovered: boolean
  onClick: (event: ThreeEvent<MouseEvent>) => void
  onPointerOver: (event: ThreeEvent<PointerEvent>) => void
  onPointerOut: () => void
}

function StatusCube({ status, hovered, ...handlers }: StatusCubeProps) {
  const material = useRef<MeshStandardMaterial>(null)
  const target = useMemo(() => new Color(STATUS_COLOR[status]), [status])

  useFrame(({ clock }, delta) => {
    const mat = material.current
    if (!mat) return
    mat.color.lerp(target, 1 - Math.exp(-delta * 6))
    mat.emissive.copy(mat.color)
    const pulse = status === 'pending' ? 0.3 + 0.2 * Math.sin(clock.elapsedTime * 3) : 0
    mat.emissiveIntensity = (hovered ? 0.2 : 0.05) + pulse
  })

  return (
    <RoundedBox args={[1, 1, 1]} radius={0.08} smoothness={4} castShadow {...handlers}>
      <meshStandardMaterial ref={material} color={STATUS_COLOR.none} roughness={0.35} metalness={0.2} />
    </RoundedBox>
  )
}
