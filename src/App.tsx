import { useState } from 'react'
import AppSettings from './AppSettings'
import Login from './Login'
import { authClient } from './lib/auth-client'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BookOpen, CalendarDays,
  Check, ChevronDown, CircleHelp, ClipboardCheck, GraduationCap, LayoutDashboard,
  Menu, MoreHorizontal, Search, Settings2, ShieldCheck, Users, X,
} from 'lucide-react'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Students', icon: Users, badge: '500' },
  { label: 'Attendance', icon: ClipboardCheck },
  { label: 'Academics', icon: BookOpen },
  { label: 'Calendar', icon: CalendarDays },
]

const attendance = [
  { day: 'Mon', present: 90, absent: 10 },
  { day: 'Tue', present: 94, absent: 6 },
  { day: 'Wed', present: 87, absent: 13 },
  { day: 'Thu', present: 96, absent: 4 },
  { day: 'Fri', present: 82, absent: 18 },
  { day: 'Sat', present: 0, absent: 0 },
  { day: 'Sun', present: 0, absent: 0 },
]

function App() {
  const [active, setActive] = useState('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return <main className="login-screen"><div className="login-loading">Opening your DigiVerse workspace…</div></main>
  if (!session) return <Login />

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><GraduationCap size={21} strokeWidth={2.3} /></div>
          <span className="brand-name">DigiVerse<span className="brand-dot">.</span></span>
          <button className="icon-button close-menu" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>

        <button className="school-switcher" aria-label="Select school">
          <div className="school-avatar">S</div>
          <span className="school-label"><strong>Sunrise Academy</strong><small>School workspace</small></span>
          <ChevronDown size={16} className="muted-icon" />
        </button>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon, badge }) => (
            <button key={label} className={`nav-link ${active === label ? 'active' : ''}`} onClick={() => setActive(label)}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>{badge && <small className="nav-badge">{badge}</small>}
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
            <div className="today-label"><CalendarDays size={15} /><span>Saturday, 21 November</span></div>
          </div>
        </header>

        {active === 'Settings' ? <AppSettings /> : <div className="page-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> PREVIEW · SAMPLE SCHOOL DATA</div>
              <h1>Good morning, <em>Admin.</em></h1>
              <p className="welcome-copy">Here’s what’s happening across Sunrise Academy today.</p>
            </div>
            <button className="date-filter"><CalendarDays size={16} /><span>This week</span><ChevronDown size={15} /></button>
          </section>

          <section className="metric-grid" aria-label="School summary">
            <article className="metric-card metric-students">
              <div className="metric-top"><span className="metric-icon mint"><Users size={18} /></span><span className="metric-delta positive"><ArrowUpRight size={14} /> 4.2%</span></div>
              <div className="metric-value">482</div><div className="metric-label">Enrolled students</div>
              <div className="metric-foot"><span>Across 12 classes</span><span className="sparkline spark-mint"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon violet"><ClipboardCheck size={18} /></span><span className="metric-delta positive"><ArrowUpRight size={14} /> 1.8%</span></div>
              <div className="metric-value">94.6<span className="metric-unit">%</span></div><div className="metric-label">Attendance today</div>
              <div className="metric-foot"><span>456 of 482 present</span><span className="sparkline spark-violet"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon amber"><BookOpen size={18} /></span><span className="metric-delta neutral"><ArrowDownRight size={14} /> 2 pending</span></div>
              <div className="metric-value">18<span className="metric-unit">/</span><span className="metric-subvalue">20</span></div><div className="metric-label">Classes in session</div>
              <div className="metric-foot"><span>2 classes start at 10:30</span><span className="sparkline spark-amber"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span></div>
            </article>
            <article className="metric-card metric-highlight">
              <div className="metric-top"><span className="metric-icon slate"><ShieldCheck size={18} /></span><span className="status-pill"><span />All clear</span></div>
              <div className="metric-value">0</div><div className="metric-label">Items needing attention</div>
              <div className="metric-foot"><span>Everything is up to date</span><span className="check-seal"><Check size={13} /></span></div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel attendance-panel">
              <div className="panel-header">
                <div><div className="panel-kicker">STUDENT PRESENCE</div><h2>Attendance overview</h2><p>Daily attendance across the school</p></div>
                <button className="select-control">This week <ChevronDown size={14} /></button>
              </div>
              <div className="chart-summary"><strong>92.4%</strong><span className="chart-change"><ArrowUpRight size={14} /> 3.1% <span>vs last week</span></span></div>
              <div className="chart" aria-label="Attendance chart for the week">
                <div className="chart-guides"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
                <div className="chart-area">
                  <div className="guide-lines"><i/><i/><i/><i/></div>
                  <div className="bars">{attendance.map((item) => <div className={`bar-group ${item.present === 0 ? 'bar-empty' : ''}`} key={item.day}>
                    <div className="bar-track"><span className="bar-present" style={{ height: `${item.present}%` }} /><span className="bar-absent" style={{ height: `${item.absent}%` }} /></div>
                    <small>{item.day}</small>
                  </div>)}</div>
                </div>
              </div>
              <div className="chart-legend"><span><i className="legend-present"/>Present</span><span><i className="legend-absent"/>Absent</span><span className="chart-note">School days only</span></div>
            </article>

            <article className="panel events-panel">
              <div className="panel-header event-heading">
                <div><div className="panel-kicker">UP NEXT</div><h2>Today at school</h2><p>Saturday, 21 November</p></div>
                <button className="icon-button subtle-more" aria-label="More events"><MoreHorizontal size={19} /></button>
              </div>
              <div className="event-list">
                <div className="event-item">
                  <div className="event-time"><strong>09:00</strong><small>AM</small></div><div className="event-rule"><i className="rule-dot teal-dot" /></div>
                  <div className="event-detail"><strong>Morning assembly</strong><span>School grounds · All classes</span><div className="avatar-stack"><i>6</i><i>7</i><i>8</i><small>+9 classes</small></div></div>
                </div>
                <div className="event-item">
                  <div className="event-time"><strong>10:30</strong><small>AM</small></div><div className="event-rule"><i className="rule-dot violet-dot" /></div>
                  <div className="event-detail"><strong>Mid-term examinations</strong><span>Class 8 · Room 204</span><div className="event-tag"><span /> In progress</div></div>
                </div>
                <div className="event-item">
                  <div className="event-time"><strong>12:15</strong><small>PM</small></div><div className="event-rule last-rule"><i className="rule-dot amber-dot" /></div>
                  <div className="event-detail"><strong>Parent–teacher meeting</strong><span>Class 5 · Conference room</span><div className="event-people"><div className="mini-avatar">SA</div><span>Samira Akter</span></div></div>
                </div>
              </div>
              <button className="all-events" onClick={() => setActive('Calendar')}>View school calendar <ArrowUpRight size={15} /></button>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="notice-strip">
              <div className="notice-symbol"><Activity size={18} /></div>
              <div className="notice-copy"><strong>Your school is off to a good start.</strong><span>Attendance is up 3.1% compared with last week. Keep it going.</span></div>
              <button aria-label="Dismiss update" onClick={() => setNotice(true)}><X size={16} /></button>
            </article>
            <div className="build-note"><span className="live-dot"/> DigiVerse <span>·</span> School overview</div>
          </section>
        </div>}
      </main>
      {notice && <div className="toast" role="status"><Check size={17} /><span>You're all caught up.</span><button aria-label="Dismiss" onClick={() => setNotice(false)}><X size={15} /></button></div>}
    </div>
  )
}

export default App
