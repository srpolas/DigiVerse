import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Download, Mail, Phone, Plus, Search, Users, X } from 'lucide-react'

interface Member {
  id: string; member_code: string; serial_number: number; full_name: string; full_name_bn: string | null
  father_name: string | null; mother_name: string | null; phone: string; gender: string | null; birthday: string | null
  designation: string; joining_date: string | null; end_date: string | null; email: string | null; nid_number: string | null
  religion: string | null; blood_group: string | null; present_village: string | null; present_thana: string | null
  present_district: string | null; present_holding: string | null; permanent_village: string | null
  permanent_thana: string | null; permanent_district: string | null; permanent_holding: string | null
  status: 'active' | 'inactive'; archived_at: string | null
}

interface Props { schoolId: string }
const emptyMember = {
  memberCode: '', serialNumber: '', fullName: '', fullNameBn: '', fatherName: '', motherName: '', phone: '', gender: '', birthday: '',
  designation: '', joiningDate: '', endDate: '', email: '', nidNumber: '', religion: '', bloodGroup: '',
  presentVillage: '', presentThana: '', presentDistrict: '', presentHolding: '',
  permanentVillage: '', permanentThana: '', permanentDistrict: '', permanentHolding: '',
}

function toForm(member: Member) {
  return {
    memberCode: member.member_code, serialNumber: String(member.serial_number || ''), fullName: member.full_name,
    fullNameBn: member.full_name_bn || '', fatherName: member.father_name || '', motherName: member.mother_name || '', phone: member.phone,
    gender: member.gender || '', birthday: member.birthday || '', designation: member.designation,
    joiningDate: member.joining_date || '', endDate: member.end_date || '', email: member.email || '', nidNumber: member.nid_number || '',
    religion: member.religion || '', bloodGroup: member.blood_group || '',
    presentVillage: member.present_village || '', presentThana: member.present_thana || '', presentDistrict: member.present_district || '', presentHolding: member.present_holding || '',
    permanentVillage: member.permanent_village || '', permanentThana: member.permanent_thana || '', permanentDistrict: member.permanent_district || '', permanentHolding: member.permanent_holding || '',
  }
}

async function responseError(response: Response) {
  const data = await response.json().catch(() => ({})) as { error?: string }
  return data.error || 'The request could not be completed.'
}

export function CommitteePage({ schoolId }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [form, setForm] = useState(emptyMember)
  const [editing, setEditing] = useState<Member | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [viewing, setViewing] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadMembers() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/school/committee?schoolId=${encodeURIComponent(schoolId)}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`)
      if (!response.ok) throw new Error(await responseError(response))
      const data = await response.json() as { members: Member[] }
      setMembers(data.members)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Committee records could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void loadMembers() }, [schoolId, search, status])

  function edit(member: Member) { setEditing(member); setForm(toForm(member)); setFormOpen(true); setError('') }
  function closeForm() { setFormOpen(false); setEditing(null); setForm(emptyMember); setError('') }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const response = await fetch(`/api/school/committee?schoolId=${encodeURIComponent(schoolId)}`, {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, serialNumber: Number(form.serialNumber) || 0, id: editing?.id, status: editing?.status || 'active' }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      closeForm(); await loadMembers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Committee member could not be saved.') }
    finally { setSaving(false) }
  }

  async function updateStatus(member: Member, nextStatus: 'active' | 'inactive') {
    if (nextStatus === 'inactive' && !window.confirm(`Deactivate ${member.full_name}? This preserves the committee record.`)) return
    try {
      const response = await fetch(`/api/school/committee?schoolId=${encodeURIComponent(schoolId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...toForm(member), serialNumber: member.serial_number, id: member.id, status: nextStatus }) })
      if (!response.ok) throw new Error(await responseError(response))
      await loadMembers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Member status could not be updated.') }
  }

  async function archive(member: Member) {
    if (!window.confirm(`Move ${member.full_name} to the archive? It can be restored later.`)) return
    try {
      const response = await fetch(`/api/school/committee?schoolId=${encodeURIComponent(schoolId)}&id=${encodeURIComponent(member.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await responseError(response))
      await loadMembers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Member could not be archived.') }
  }

  async function restore(member: Member) {
    try {
      const response = await fetch(`/api/school/committee?schoolId=${encodeURIComponent(schoolId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: member.id, restore: true }) })
      if (!response.ok) throw new Error(await responseError(response))
      await loadMembers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Member could not be restored.') }
  }

  async function exportCsv() {
    const response = await fetch(`/api/school/committee?schoolId=${encodeURIComponent(schoolId)}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`)
    if (!response.ok) { setError(await responseError(response)); return }
    const data = await response.json() as { members: Member[] }
    const headers = ['Serial number', 'Member ID', 'Name', 'Designation', 'Phone', 'Email', 'Join date', 'End date', 'Status']
    const rows = data.members.map((member) => [member.serial_number, member.member_code, member.full_name, member.designation, member.phone, member.email || '', member.joining_date || '', member.end_date || '', member.archived_at ? 'archived' : member.status])
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'digiverse-committee.csv'; link.click(); URL.revokeObjectURL(url)
  }

  const field = (label: string, key: keyof typeof emptyMember, required = false, type = 'text') => <label key={key}>{label}<input type={type} required={required} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>

  return <section className="settings-page data-page">
    <div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> SCHOOL GOVERNANCE</div><h1>Committee Management</h1><p>Manage committee member profiles, positions, and service dates.</p></div><button className="primary-button compact-action" onClick={() => { setEditing(null); setForm(emptyMember); setFormOpen(!formOpen); setError('') }}><Plus size={15} /> Add member</button></div>
    <div className="settings-card data-card">
      <div className="data-card-header"><div><h2>Member list</h2><p>{members.length} records shown</p></div><div className="data-filters"><label className="student-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, position…" /></label><select aria-label="Filter committee status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All current</option><option value="archived">Archived</option></select><button className="quiet-button export-button" onClick={() => void exportCsv()}><Download size={14} /> CSV</button></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {formOpen && <form className="student-form teacher-form" onSubmit={save}><div className="student-form-heading"><strong>{editing ? 'Edit committee member' : 'Add new committee member'}</strong><button type="button" className="icon-button" aria-label="Close form" onClick={closeForm}><X size={16} /></button></div>
        <h3>General information</h3><div className="student-form-grid">
          {field('Member ID', 'memberCode', true)}{field('Serial / numerical number', 'serialNumber', false, 'number')}{field('Name (English)', 'fullName', true)}{field('Name (Bangla)', 'fullNameBn')}
          {field("Father's name", 'fatherName')}{field("Mother's name", 'motherName')}{field('Mobile', 'phone', true, 'tel')}
          <label>Gender<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></select></label>
          {field('Birthday', 'birthday', false, 'date')}{field('Email', 'email', false, 'email')}{field('NID number', 'nidNumber')}
          <label>Religion<select value={form.religion} onChange={(event) => setForm({ ...form, religion: event.target.value })}><option value="">Select religion</option>{['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Blood group<select value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })}><option value="">Select blood group</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <h3>Position information</h3><div className="student-form-grid">{field('Designation', 'designation', true)}{field('Join date', 'joiningDate', false, 'date')}{field('End date', 'endDate', false, 'date')}</div>
        <h3>Present address</h3><div className="student-form-grid">{field('Village', 'presentVillage')}{field('Thana / upazila', 'presentThana')}{field('District', 'presentDistrict')}{field('Holding / house', 'presentHolding')}</div>
        <h3>Permanent address</h3><div className="student-form-grid">{field('Village', 'permanentVillage')}{field('Thana / upazila', 'permanentThana')}{field('District', 'permanentDistrict')}{field('Holding / house', 'permanentHolding')}</div>
        <div className="student-form-actions"><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save member' : 'Create member'}</button><button type="button" className="quiet-button" onClick={closeForm}>Cancel</button></div>
      </form>}
      {loading ? <div className="data-empty">Loading committee records…</div> : members.length === 0 ? <div className="data-empty"><span className="empty-icon"><Users size={20} /></span><strong>No committee members found</strong><p>{search ? 'Try a different search.' : status === 'archived' ? 'Archived committee records will appear here.' : 'Add your first committee member to get started.'}</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Sl</th><th>Member ID</th><th>Member name</th><th>Numerical no.</th><th>Designation</th><th>Contact number</th><th>Join date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{members.map((member, index) => <tr key={member.id}><td>{index + 1}</td><td>{member.member_code}</td><td><strong>{member.full_name}</strong>{member.full_name_bn && <small className="cell-subtitle">{member.full_name_bn}</small>}</td><td>{member.serial_number}</td><td>{member.designation}</td><td><span className="teacher-contact"><span><Phone size={12} />{member.phone}</span>{member.email && <span><Mail size={12} />{member.email}</span>}</span></td><td>{member.joining_date || '—'}</td><td><span className={`student-status status-${member.archived_at ? 'inactive' : member.status}`}>{member.archived_at ? 'archived' : member.status}</span></td><td className="teacher-actions"><button onClick={() => setViewing(member)}>View</button>{member.archived_at ? <button onClick={() => void restore(member)}>Restore</button> : <><button onClick={() => edit(member)}>Edit</button><button onClick={() => void updateStatus(member, member.status === 'active' ? 'inactive' : 'active')}>{member.status === 'active' ? 'Deactivate' : 'Activate'}</button><button className="danger-text" onClick={() => void archive(member)}>Delete</button></>}</td></tr>)}</tbody></table></div>}
    </div>
    {viewing && <div className="dialog-backdrop" onClick={() => setViewing(null)}><section className="teacher-dialog" role="dialog" aria-modal="true" aria-labelledby="committee-detail-title" onClick={(event) => event.stopPropagation()}><div className="student-form-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> COMMITTEE PROFILE</div><h2 id="committee-detail-title">{viewing.full_name}</h2><p>{viewing.designation} · Member ID {viewing.member_code}</p></div><button className="icon-button" aria-label="Close committee profile" onClick={() => setViewing(null)}><X size={17} /></button></div><div className="teacher-details-grid">{[
      ['Bangla name', viewing.full_name_bn], ["Father's name", viewing.father_name], ["Mother's name", viewing.mother_name], ['Mobile', viewing.phone], ['Gender', viewing.gender], ['Birthday', viewing.birthday], ['Email', viewing.email], ['NID', viewing.nid_number], ['Designation', viewing.designation], ['Join date', viewing.joining_date], ['End date', viewing.end_date], ['Religion', viewing.religion], ['Blood group', viewing.blood_group], ['Serial number', viewing.serial_number],
    ].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value || '—'}</strong></div>)}</div><div className="teacher-addresses">{[['Present address', [viewing.present_holding, viewing.present_village, viewing.present_thana, viewing.present_district]], ['Permanent address', [viewing.permanent_holding, viewing.permanent_village, viewing.permanent_thana, viewing.permanent_district]]].map(([label, parts]) => <div key={label as string}><small>{label as string}</small><strong>{(parts as (string | null)[]).filter(Boolean).join(', ') || '—'}</strong></div>)}</div><div className="student-form-actions"><button className="primary-button" onClick={() => { edit(viewing); setViewing(null) }}>Edit profile</button><button className="quiet-button" onClick={() => setViewing(null)}>Close</button></div></section></div>}
  </section>
}
