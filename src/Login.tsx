import { useState } from 'react'
import type { FormEvent } from 'react'
import { GraduationCap, ShieldCheck } from 'lucide-react'
import { authClient } from './lib/auth-client'

export default function Login() {
  const [mode, setMode] = useState<'sign-in' | 'create'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const result = mode === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name, email, password })
      if (result.error) throw new Error(result.error.message || 'Authentication failed.')
      window.location.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed.')
    } finally { setBusy(false) }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand"><span><GraduationCap size={22} /></span><strong>DigiVerse<span>.</span></strong></div>
        <div className="login-eyebrow">SCHOOL MANAGEMENT</div>
        <h1>{mode === 'sign-in' ? 'Welcome back.' : 'Create your account.'}</h1>
        <p>{mode === 'sign-in' ? 'Sign in to continue to your school workspace.' : 'Start setting up your DigiVerse workspace.'}</p>
        <form className="settings-form" onSubmit={submit}>
          {mode === 'create' && <label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>}
          <label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="login-mode-toggle" onClick={() => { setMode(mode === 'sign-in' ? 'create' : 'sign-in'); setError('') }}>
          {mode === 'sign-in' ? 'New to DigiVerse? Create an account' : 'Already have an account? Sign in'}
        </button>
        <div className="login-security"><ShieldCheck size={15} /> Accounts and sessions are stored in DigiVerse D1.</div>
      </section>
    </main>
  )
}
