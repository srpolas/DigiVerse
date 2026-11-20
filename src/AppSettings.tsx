import { Database, HardDrive, ShieldCheck } from 'lucide-react'

export default function AppSettings() {
  return (
    <section className="settings-page">
      <div className="settings-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> PLATFORM</div><h1>Application settings</h1><p>Review how this DigiVerse installation stores its data.</p></div>
      </div>
      <div className="platform-settings-grid">
        <article className="settings-card platform-setting-card">
          <span className="platform-setting-icon"><Database size={19} /></span><div><h2>School database</h2><p>Cloudflare D1 stores school records, user accounts, and sessions for this installation.</p><small>Database binding: CONTROL_DB</small></div>
        </article>
        <article className="settings-card platform-setting-card">
          <span className="platform-setting-icon"><HardDrive size={19} /></span><div><h2>School files</h2><p>R2 stores student photos and generated school documents.</p><small>Bucket binding: SCHOOL_FILES</small></div>
        </article>
        <aside className="platform-settings-note"><ShieldCheck size={18} /><div><strong>Database resource is managed in Cloudflare</strong><p>For safety, this app does not accept database credentials or change its D1 binding. Update the binding in Wrangler and deploy to point DigiVerse at a different D1 database.</p></div></aside>
      </div>
    </section>
  )
}
