import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Download, Mail, Phone, Plus, Search, Users, X } from 'lucide-react'

interface Staff {
  id: string; staff_code: string; serial_number: number; full_name: string; full_name_bn: string | null
  father_name: string | null; mother_name: string | null; phone: string; gender: string | null; birthday: string | null
  designation: string; joining_date: string | null; email: string | null; previous_institution: string | null
  nid_number: string | null; punch_code: string | null; religion: string | null; blood_group: string | null
  present_village: string | null; present_post_office: string | null; present_thana: string | null
  present_district: string | null; present_holding: string | null; permanent_village: string | null
  permanent_post_office: string | null; permanent_thana: string | null; permanent_district: string | null
  permanent_holding: string | null; status: 'active' | 'inactive'; archived_at: string | null
}

interface Props { schoolId: string }
const emptyStaff = {
  staffCode: '', serialNumber: '', fullName: '', fullNameBn: '', fatherName: '', motherName: '', phone: '', gender: '', birthday: '',
  designation: '', joiningDate: '', email: '', previousInstitution: '', nidNumber: '', punchCode: '', religion: '', bloodGroup: '',
  presentVillage: '', presentPostOffice: '', presentThana: '', presentDistrict: '', presentHolding: '',
  permanentVillage: '', permanentPostOffice: '', permanentThana: '', permanentDistrict: '', permanentHolding: '',
}

function toForm(staff: Staff) {
  return {
    staffCode: staff.staff_code, serialNumber: String(staff.serial_number || ''), fullName: staff.full_name,
    fullNameBn: staff.full_name_bn || '', fatherName: staff.father_name || '', motherName: staff.mother_name || '', phone: staff.phone,
    gender: staff.gender || '', birthday: staff.birthday || '', designation: staff.designation,
    joiningDate: staff.joining_date || '', email: staff.email || '', previousInstitution: staff.previous_institution || '',
    nidNumber: staff.nid_number || '', punchCode: staff.punch_code || '', religion: staff.religion || '', bloodGroup: staff.blood_group || '',
    presentVillage: staff.present_village || '', presentPostOffice: staff.present_post_office || '', presentThana: staff.present_thana || '',
    presentDistrict: staff.present_district || '', presentHolding: staff.present_holding || '',
    permanentVillage: staff.permanent_village || '', permanentPostOffice: staff.permanent_post_office || '', permanentThana: staff.permanent_thana || '',
    permanentDistrict: staff.permanent_district || '', permanentHolding: staff.permanent_holding || '',
  }
}

async function responseError(response: Response) {
  const data = await response.json().catch(() => ({})) as { error?: string }
  return data.error || 'The request could not be completed.'
}

export function StaffPage({ schoolId }: Props) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [form, setForm] = useState(emptyStaff)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [viewing, setViewing] = useState<Staff | null>(null)
  const [resetLink, setResetLink] = useState('')
  const [resetError, setResetError] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadStaff() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/school/staff?schoolId=${encodeURIComponent(schoolId)}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`)
      if (!response.ok) throw new Error(await responseError(response))
      const data = await response.json() as { staff: Staff[] }
      setStaff(data.staff)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Staff records could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void loadStaff() }, [schoolId, search, status])

  function edit(row: Staff) { setEditing(row); setForm(toForm(row)); setFormOpen(true); setError('') }
  function closeForm() { setFormOpen(false); setEditing(null); setForm(emptyStaff); setError('') }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    const data = { ...form, serialNumber: Number(form.serialNumber) || 0, id: editing?.id, status: editing?.status || 'active' }
    try {
      const response = await fetch(`/api/school/staff?schoolId=${encodeURIComponent(schoolId)}`, {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error(await responseError(response))
      closeForm(); await loadStaff()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Staff record could not be saved.') }
    finally { setSaving(false) }
  }

  async function updateStatus(row: Staff, nextStatus: 'active' | 'inactive') {
    if (nextStatus === 'inactive' && !window.confirm(`Deactivate ${row.full_name}? This will preserve their record.`)) return
    try {
      const response = await fetch(`/api/school/staff?schoolId=${encodeURIComponent(schoolId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...toForm(row), serialNumber: row.serial_number, id: row.id, status: nextStatus }) })
      if (!response.ok) throw new Error(await responseError(response))
      await loadStaff()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Staff status could not be updated.') }
  }

  async function archive(row: Staff) {
    if (!window.confirm(`Move ${row.full_name} to the archive? It can be restored later.`)) return
    try {
      const response = await fetch(`/api/school/staff?schoolId=${encodeURIComponent(schoolId)}&id=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await responseError(response))
      await loadStaff()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Staff record could not be archived.') }
  }

  async function restore(row: Staff) {
    try {
      const response = await fetch(`/api/school/staff?schoolId=${encodeURIComponent(schoolId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, restore: true }) })
      if (!response.ok) throw new Error(await responseError(response))
      await loadStaff()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Staff record could not be restored.') }
  }

  async function resetPassword(row: Staff) {
    if (!window.confirm(`Create a one-time password reset link for ${row.full_name}? Anyone with the link can change that login password.`)) return
    setResetLink(''); setResetError(''); setCopied(false)
    try {
      const response = await fetch(`/api/school/staff/reset-password?schoolId=${encodeURIComponent(schoolId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId: row.id }) })
      if (!response.ok) throw new Error(await responseError(response))
      const data = await response.json() as { resetUrl: string }
      setResetLink(data.resetUrl)
    } catch (cause) { setResetError(cause instanceof Error ? cause.message : 'A reset link could not be created.') }
  }

  async function exportCsv() {
    const response = await fetch(`/api/school/staff?schoolId=${encodeURIComponent(schoolId)}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`)
    if (!response.ok) { setError(await responseError(response)); return }
    const data = await response.json() as { staff: Staff[] }
    const headers = ['Serial number', 'Staff ID', 'Name', 'Designation', 'Phone', 'Email', 'Punch code', 'Status']
    const rows = data.staff.map((row) => [row.serial_number, row.staff_code, row.full_name, row.designation, row.phone, row.email || '', row.punch_code || '', row.archived_at ? 'archived' : row.status])
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'digiverse-staff.csv'; link.click(); URL.revokeObjectURL(url)
  }

  const textInput = (label: string, key: keyof typeof emptyStaff, required = false, type = 'text') => <label key={key}>{label}<input type={type} required={required} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>

  return <section className="settings-page data-page">
    <div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> STAFF DIRECTORY</div><h1>Staffs Management</h1><p>Maintain staff profiles, contact details, and employment status.</p></div><button className="primary-button compact-action" onClick={() => { setEditing(null); setForm(emptyStaff); setFormOpen(!formOpen); setError('') }}><Plus size={15} /> Add staff</button></div>
    <div className="settings-card data-card">
      <div className="data-card-header"><div><h2>Staff list</h2><p>{staff.length} records shown</p></div><div className="data-filters"><label className="student-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, designation…" /></label><select aria-label="Filter staff status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All current</option><option value="archived">Archived</option></select><button className="quiet-button export-button" onClick={() => void exportCsv()}><Download size={14} /> CSV</button></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {formOpen && <form className="student-form teacher-form" onSubmit={save}><div className="student-form-heading"><strong>{editing ? 'Edit staff profile' : 'Add new staff'}</strong><button type="button" className="icon-button" aria-label="Close form" onClick={closeForm}><X size={16} /></button></div>
        <h3>General information</h3><div className="student-form-grid">
          {textInput('Staff ID', 'staffCode', true)}{textInput('Serial / numerical number', 'serialNumber', false, 'number')}
          {textInput('Name (English)', 'fullName', true)}{textInput('Name (Bangla)', 'fullNameBn')}{textInput("Father's name", 'fatherName')}{textInput("Mother's name", 'motherName')}
          {textInput('Mobile', 'phone', true, 'tel')}<label>Gender<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></select></label>
          {textInput('Birthday', 'birthday', false, 'date')}{textInput('Email', 'email', false, 'email')}{textInput('NID number', 'nidNumber')}
          <label>Religion<select value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })}><option value="">Select religion</option>{['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Blood group<select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}><option value="">Select blood group</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <h3>Office information</h3><div className="student-form-grid">{textInput('Designation', 'designation', true)}{textInput('Join date', 'joiningDate', false, 'date')}{textInput('Previous institution', 'previousInstitution')}{textInput('Punch code', 'punchCode')}</div>
        <h3>Present address</h3><div className="student-form-grid">{textInput('Village', 'presentVillage')}{textInput('Post office', 'presentPostOffice')}{textInput('Thana / upazila', 'presentThana')}{textInput('District', 'presentDistrict')}{textInput('Holding / house', 'presentHolding')}</div>
        <h3>Permanent address</h3><div className="student-form-grid">{textInput('Village', 'permanentVillage')}{textInput('Post office', 'permanentPostOffice')}{textInput('Thana / upazila', 'permanentThana')}{textInput('District', 'permanentDistrict')}{textInput('Holding / house', 'permanentHolding')}</div>
        <div className="student-form-actions"><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save staff' : 'Create staff'}</button><button type="button" className="quiet-button" onClick={closeForm}>Cancel</button></div>
      </form>}
      {loading ? <div className="data-empty">Loading staff records…</div> : staff.length === 0 ? <div className="data-empty"><span className="empty-icon"><Users size={20} /></span><strong>No staff found</strong><p>{search ? 'Try a different search.' : status === 'archived' ? 'Archived staff records will appear here.' : 'Add your first staff profile to get started.'}</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Sl</th><th>Staff ID</th><th>Staff name</th><th>Numerical no.</th><th>Designation</th><th>Contact number</th><th>Punch code</th><th>Status</th><th>Actions</th></tr></thead><tbody>{staff.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td>{row.staff_code}</td><td><strong>{row.full_name}</strong>{row.full_name_bn && <small className="cell-subtitle">{row.full_name_bn}</small>}</td><td>{row.serial_number}</td><td>{row.designation}</td><td><span className="teacher-contact"><span><Phone size={12} />{row.phone}</span>{row.email && <span><Mail size={12} />{row.email}</span>}</span></td><td>{row.punch_code || '—'}</td><td><span className={`student-status status-${row.archived_at ? 'inactive' : row.status}`}>{row.archived_at ? 'archived' : row.status}</span></td><td className="teacher-actions"><button onClick={() => setViewing(row)}>View</button>{row.archived_at ? <button onClick={() => void restore(row)}>Restore</button> : <><button onClick={() => edit(row)}>Edit</button><button onClick={() => void resetPassword(row)}>Reset password</button><button onClick={() => void updateStatus(row, row.status === 'active' ? 'inactive' : 'active')}>{row.status === 'active' ? 'Deactivate' : 'Activate'}</button><button className="danger-text" onClick={() => void archive(row)}>Delete</button></>}</td></tr>)}</tbody></table></div>}
    </div>
    {viewing && <div className="dialog-backdrop" onClick={() => setViewing(null)}><section className="teacher-dialog" role="dialog" aria-modal="true" aria-labelledby="staff-detail-title" onClick={(event) => event.stopPropagation()}><div className="student-form-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> STAFF PROFILE</div><h2 id="staff-detail-title">{viewing.full_name}</h2><p>{viewing.designation} · Staff ID {viewing.staff_code}</p></div><button className="icon-button" aria-label="Close staff profile" onClick={() => setViewing(null)}><X size={17} /></button></div><div className="teacher-details-grid">{[
      ['Name (Bangla)', viewing.full_name_bn], ["Father's name", viewing.father_name], ["Mother's name", viewing.mother_name], ['Mobile', viewing.phone], ['Gender', viewing.gender], ['Birthday', viewing.birthday], ['Email', viewing.email], ['NID', viewing.nid_number], ['Designation', viewing.designation], ['Join date', viewing.joining_date], ['Previous institution', viewing.previous_institution], ['Punch code', viewing.punch_code], ['Religion', viewing.religion], ['Blood group', viewing.blood_group], ['Serial number', viewing.serial_number],
    ].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value || '—'}</strong></div>)}</div><div className="teacher-addresses">{[['Present address', [viewing.present_holding, viewing.present_village, viewing.present_post_office, viewing.present_thana, viewing.present_district]], ['Permanent address', [viewing.permanent_holding, viewing.permanent_village, viewing.permanent_post_office, viewing.permanent_thana, viewing.permanent_district]]].map(([label, parts]) => <div key={label as string}><small>{label as string}</small><strong>{(parts as (string | null)[]).filter(Boolean).join(', ') || '—'}</strong></div>)}</div><div className="student-form-actions"><button className="primary-button" onClick={() => { edit(viewing); setViewing(null) }}>Edit profile</button><button className="quiet-button" onClick={() => setViewing(null)}>Close</button></div></section></div>}
    {(resetLink || resetError) && <div className="dialog-backdrop" onClick={() => { setResetLink(''); setResetError('') }}><section className="teacher-dialog reset-dialog" role="dialog" aria-modal="true" aria-labelledby="staff-reset-title" onClick={(event) => event.stopPropagation()}><div className="student-form-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ACCOUNT SECURITY</div><h2 id="staff-reset-title">Reset staff password</h2><p>Share the one-time reset link privately. It expires in one hour.</p></div><button className="icon-button" aria-label="Close reset dialog" onClick={() => { setResetLink(''); setResetError('') }}><X size={17} /></button></div>{resetError && <div className="form-error" role="alert">{resetError}</div>}{resetLink && <><label className="reset-link-field">Reset link<input readOnly value={resetLink} /></label><div className="form-success">Anyone with this link can change the staff member's password.</div><button className="primary-button copy-reset-button" onClick={() => void navigator.clipboard.writeText(resetLink).then(() => setCopied(true))}>{copied ? 'Copied reset link' : 'Copy reset link'}</button></>}</section></div>}
  </section>
}
