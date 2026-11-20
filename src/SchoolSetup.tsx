import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, GraduationCap, Landmark } from 'lucide-react'

interface School {
  id: string
  name: string
  slug: string
  eiin: string | null
  timezone: string
  role: string
  studentCount: number
  classCount: number
}

interface SchoolSetupProps {
  onCreated: (school: School) => void
}

export type { School }

export default function SchoolSetup({ onCreated }: SchoolSetupProps) {
  const [name, setName] = useState('')
  const [eiin, setEiin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, eiin }),
      })
      const result = await response.json() as { school?: School; error?: string }
      if (!response.ok || !result.school) throw new Error(result.error || 'School setup failed. Try again.')
      onCreated(result.school)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'School setup failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-screen setup-screen">
      <section className="login-card setup-card">
        <div className="login-brand"><span><GraduationCap size={22} /></span><strong>DigiVerse<span>.</span></strong></div>
        <div className="setup-mark"><Landmark size={20} /></div>
        <div className="login-eyebrow">YOUR SCHOOL WORKSPACE</div>
        <h1>Let’s set up your school.</h1>
        <p>Add the school details staff will see across DigiVerse. You’ll be its first school administrator.</p>
        <form className="settings-form" onSubmit={submit}>
          <label>School name<input autoComplete="organization" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sunrise Academy" required minLength={2} /></label>
          <label><span className="setup-label">EIIN <small>Optional</small></span><input inputMode="numeric" maxLength={32} value={eiin} onChange={(event) => setEiin(event.target.value)} placeholder="Education institution ID" /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button" disabled={busy}>{busy ? 'Saving school…' : <>Create school workspace <ArrowRight size={15} /></>}</button>
        </form>
        <div className="login-security">School records are stored in your Cloudflare D1 database.</div>
      </section>
    </main>
  )
}
