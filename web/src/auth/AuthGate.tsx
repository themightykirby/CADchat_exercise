import { useState, useSyncExternalStore } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { login, logout } from '../api/client'
import { getSession, subscribeSession } from './session'

export function AuthGate({ children }: { children: ReactNode }) {
  const signedIn = useSyncExternalStore(subscribeSession, () => getSession() !== null)

  if (!signedIn) return <SignIn />

  return (
    <>
      {children}
      <button
        type="button"
        onClick={logout}
        className="fixed right-3 top-3 z-10 cursor-pointer rounded bg-black/60 px-3 py-1 text-sm text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Sign out
      </button>
    </>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center">
      <form onSubmit={(e) => void onSubmit(e)} className="flex w-72 flex-col gap-3">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="cursor-pointer rounded bg-black px-3 py-2 text-white enabled:hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
