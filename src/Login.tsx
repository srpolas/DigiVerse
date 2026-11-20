import { useState } from 'react'
import type { FormEvent } from 'react'
import { GraduationCap, ShieldCheck } from 'lucide-react'
import { authClient } from './lib/auth-client'

export default function Login() {
  const resetToken = new URLSearchParams(window.location.search).get('resetToken') || ''
  const [mode, setMode] = useState<'sign-in' | 'create' | 'reset'>(resetToken ? 'reset' : 'sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordAgain, setPasswordAgain] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      if (mode === 'reset') {
        if (password !== passwordAgain) throw new Error('The passwords do not match.')
        const result = await authClient.resetPassword({ newPassword: password, token: resetToken })
        if (result.error) throw new Error(result.error.message || 'Password reset failed.')
        window.history.replaceState({}, '', window.location.pathname)
        setPassword(''); setPasswordAgain(''); setMode('sign-in'); setNotice('Password updated. Sign in with your new password.')
        return
      }
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
        <h1>{mode === 'reset' ? 'Choose a new password.' : mode === 'sign-in' ? 'Welcome back.' : 'Create your account.'}</h1>
        <p>{mode === 'reset' ? 'Set a new password for your DigiVerse account.' : mode === 'sign-in' ? 'Sign in to continue to your school workspace.' : 'Start setting up your DigiVerse workspace.'}</p>
        <form className="settings-form" onSubmit={submit}>
          {mode === 'create' && <label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>}
          {mode !== 'reset' && <label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />{mode === 'sign-in' && <small className="forgot-password-note">Forgot password? Ask your school administrator for a reset link.</small>}</label>}
          <label>{mode === 'reset' ? 'New password' : 'Password'}<input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {mode === 'reset' && <label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} value={passwordAgain} onChange={(event) => setPasswordAgain(event.target.value)} required /></label>}
          {notice && <div className="form-success" role="status">{notice}</div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'reset' ? 'Update password' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        </form>
        {mode !== 'reset' && <button className="login-mode-toggle" onClick={() => { setMode(mode === 'sign-in' ? 'create' : 'sign-in'); setError(''); setNotice('') }}>
          {mode === 'sign-in' ? 'New to DigiVerse? Create an account' : 'Already have an account? Sign in'}
        </button>}
        <div className="login-security"><ShieldCheck size={15} /> Accounts and sessions are stored in DigiVerse D1.</div>
      </section>
    </main>
  )
}
