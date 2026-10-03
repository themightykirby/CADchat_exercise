import type {
  CreateReviewBody,
  PatchReviewBody,
  Review,
} from './types'
import { getSession, setSession } from '../auth/session'
import type { Session } from '../auth/session'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function send(path: string, init: RequestInit | undefined, token: string | null) {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
}

async function refreshSession(): Promise<Session | null> {
  const current = getSession()
  if (!current) return null
  const response = await send(
    '/auth/refresh',
    { method: 'POST', body: JSON.stringify({ refresh_token: current.refresh_token }) },
    null,
  )
  if (!response.ok) {
    setSession(null)
    return null
  }
  const next = (await response.json()) as Session
  setSession(next)
  return next
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await send(path, init, getSession()?.access_token ?? null)
  if (response.status === 401) {
    const next = await refreshSession()
    if (next) response = await send(path, init, next.access_token)
  }
  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}`)
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

export async function login(email: string, password: string): Promise<void> {
  const response = await send('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, null)
  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.status === 401 ? 'Invalid email or password' : `Sign in failed (${response.status})`,
    )
  }
  setSession((await response.json()) as Session)
}

export function logout(): void {
  setSession(null)
}

export function getReviewsByCube(cubeId: string): Promise<Review[]> {
  return request<Review[]>(`/reviews?cube_id=${encodeURIComponent(cubeId)}`)
}

export function createReview(body: CreateReviewBody): Promise<Review> {
  return request<Review>('/reviews', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateReviewStatus(
  id: string,
  status: PatchReviewBody['status'],
): Promise<Review> {
  const body: PatchReviewBody = { status }
  return request<Review>(`/reviews/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteReview(id: string): Promise<void> {
  return request<void>(`/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
