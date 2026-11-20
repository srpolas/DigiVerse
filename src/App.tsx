import { useEffect, useState } from 'react'
import AppSettings from './AppSettings'
import Login from './Login'
import SchoolSetup, { type School } from './SchoolSetup'
import { authClient } from './lib/auth-client'
import {
  ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays, CircleHelp,
  ChevronDown, ClipboardCheck, GraduationCap, LayoutDashboard, Menu, MoreHorizontal,
  Search, Settings2, Users, X,
} from 'lucide-react'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Students', icon: Users },
  { label: 'Attendance', icon: ClipboardCheck },
  { label: 'Academics', icon: BookOpen },
  { label: 'Calendar', icon: CalendarDays },
]

function App() {
  const [active, setActive] = useState('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { data: session, isPending } = authClient.useSession()
  const [schools, setSchools] = useState<School[] | null>(null)
  const [schoolLoadError, setSchoolLoadError] = useState('')
  const [schoolLoadAttempt, setSchoolLoadAttempt] = useState(0)

  useEffect(() => {
    if (!session?.user.id) {
      setSchools(null)
      return
    }
    let current = true
    setSchools(null)
    setSchoolLoadError('')
    void (async () => {
      try {
        const response = await fetch('/api/school')
        const result = await response.json() as { schools?: School[]; error?: string }
        if (!response.ok) throw new Error(result.error || 'Could not load your school workspace.')
        if (current) setSchools(result.schools || [])
      } catch (cause) {
        if (current) setSchoolLoadError(cause instanceof Error ? cause.message : 'Could not load your school workspace.')
      }
    })()
    return () => { current = false }
  }, [session?.user.id, schoolLoadAttempt])

  if (isPending) return <main className="login-screen"><div className="login-loading">Opening your DigiVerse workspace…</div></main>
  if (!session) return <Login />
  if (schoolLoadError) return <main className="login-screen"><div className="workspace-error" role="alert"><strong>Your school workspace didn’t load.</strong><p>{schoolLoadError}</p><button className="primary-button" onClick={() => setSchoolLoadAttempt((attempt) => attempt + 1)}>Try again</button></div></main>
  if (!schools) return <main className="login-screen"><div className="login-loading">Loading your school workspace…</div></main>
  if (schools.length === 0) return <SchoolSetup onCreated={(school) => setSchools([school])} />

  const school = schools[0]
  const firstName = session.user.name.trim().split(/\s+/)[0] || 'there'
  const today = new Intl.DateTimeFormat('en-BD', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: school.timezone,
  }).format(new Date())

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><GraduationCap size={21} strokeWidth={2.3} /></div>
          <span className="brand-name">DigiVerse<span className="brand-dot">.</span></span>
          <button className="icon-button close-menu" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>

        <button className="school-switcher" aria-label="School workspace">
          <div className="school-avatar">{school.name.slice(0, 1).toUpperCase()}</div>
          <span className="school-label"><strong>{school.name}</strong><small>{school.role.replace('_', ' ')}</small></span>
          <ChevronDown size={16} className="muted-icon" />
        </button>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-link ${active === label ? 'active' : ''}`} onClick={() => setActive(label)}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="nav-caption tools-caption">MANAGE</div>
        <nav className="main-nav" aria-label="Management navigation">
          <button className="nav-link" onClick={() => setActive('People')}><Users size={18} strokeWidth={1.9} /><span>People</span></button>
          <button className="nav-link" onClick={() => setActive('Settings')}><Settings2 size={18} strokeWidth={1.9} /><span>Settings</span></button>
        </nav>

        <div className="sidebar-bottom">
          <div className="support-card">
            <div className="support-icon"><CircleHelp size={17} /></div>
            <strong>Need a hand?</strong>
            <p>Find your way around DigiVerse.</p>
            <button onClick={() => setNotice(true)}>Visit help center <ArrowUpRight size={14} /></button>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">{session.user.name.slice(0, 2).toUpperCase()}</div>
            <span><strong>{session.user.name}</strong><small>{session.user.email}</small></span>
            <button className="icon-button profile-signout" aria-label="Sign out" onClick={() => void authClient.signOut()}><MoreHorizontal size={18} className="muted-icon" /></button>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{active}</strong></div>
          <div className="topbar-actions">
            <button className={`icon-button search-toggle ${searchOpen ? 'selected' : ''}`} aria-label="Search" onClick={() => setSearchOpen(!searchOpen)}><Search size={18} /></button>
            {searchOpen && <input className="quick-search" autoFocus placeholder="Search students, classes…" />}
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice(!notice)}>
              <Bell size={18} /><i />
            </button>
            <div className="topbar-divider" />
            <div className="today-label"><CalendarDays size={15} /><span>{today}</span></div>
          </div>
        </header>

        {active === 'Settings' ? <AppSettings /> : active !== 'Overview' ? <section className="settings-page module-placeholder"><div className="settings-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> SCHOOL WORKSPACE</div><h1>{active}</h1><p>This module is being prepared for {school.name}.</p></div></div><div className="settings-card next-module-card"><span className="platform-setting-icon"><ArrowRight size={19} /></span><div><h2>Next up for your school</h2><p>School setup is saved. Student and class management will be added here next.</p></div></div></section> : <div className="page-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> SCHOOL WORKSPACE</div>
              <h1>Welcome, <em>{firstName}.</em></h1>
              <p className="welcome-copy">Your workspace for {school.name} is ready.</p>
            </div>
            <div className="workspace-role">{school.role.replace('_', ' ')}</div>
          </section>

          <section className="metric-grid school-metrics" aria-label="School summary">
            <article className="metric-card metric-students">
              <div className="metric-top"><span className="metric-icon mint"><Users size={18} /></span></div>
              <div className="metric-value">{school.studentCount}</div><div className="metric-label">Enrolled students</div>
              <div className="metric-foot"><span>{school.studentCount === 0 ? 'Ready for your first student' : 'Active student records'}</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon violet"><ClipboardCheck size={18} /></span></div>
              <div className="metric-value">—</div><div className="metric-label">Attendance today</div>
              <div className="metric-foot"><span>Starts after enrollment</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon amber"><BookOpen size={18} /></span></div>
              <div className="metric-value">{school.classCount}</div><div className="metric-label">Classes</div>
              <div className="metric-foot"><span>{school.classCount === 0 ? 'Set up classes before enrollment' : 'Class groups configured'}</span></div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel attendance-panel">
              <div className="panel-header">
                <div><div className="panel-kicker">GETTING STARTED</div><h2>Your school is set up</h2><p>These are the first steps to start using DigiVerse.</p></div>
              </div>
              <div className="first-steps"><div><span>1</span><p><strong>Create classes and sections</strong><small>Arrange your school’s grade levels.</small></p></div><div><span>2</span><p><strong>Enroll students</strong><small>Add student profiles and guardian details.</small></p></div><div><span>3</span><p><strong>Start taking attendance</strong><small>Record daily presence by class.</small></p></div></div>
            </article>

            <article className="panel events-panel">
              <div className="panel-header event-heading">
                <div><div className="panel-kicker">SCHOOL DETAILS</div><h2>{school.name}</h2><p>{school.eiin ? `EIIN ${school.eiin}` : 'Education institution'}</p></div>
              </div>
              <div className="school-detail-list"><div><span>Workspace role</span><strong>{school.role.replace('_', ' ')}</strong></div><div><span>Time zone</span><strong>{school.timezone}</strong></div><div><span>School web address</span><strong>{school.slug}</strong></div></div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="notice-strip"><div className="notice-symbol"><BookOpen size={18} /></div><div className="notice-copy"><strong>Next: build your class list.</strong><span>Use Academics to get your structure ready before adding students.</span></div><button onClick={() => setActive('Academics')}>Academics <ArrowRight size={14} /></button></article>
            <div className="build-note"><span className="live-dot"/> DigiVerse <span>·</span> {today}</div>
          </section>
        </div>}
      </main>
      {notice && <div className="toast" role="status"><span>Notifications will appear here.</span><button aria-label="Dismiss" onClick={() => setNotice(false)}><X size={15} /></button></div>}
    </div>
  )
}

export default App
