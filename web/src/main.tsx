import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './auth/AuthGate.tsx'

const authRequired = import.meta.env.VITE_AUTH_REQUIRED === 'true'
const app = <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {authRequired ? <AuthGate>{app}</AuthGate> : app}
  </StrictMode>,
)
