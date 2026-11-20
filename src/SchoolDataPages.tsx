import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Mail, Phone, Plus, Search, Users, X } from 'lucide-react'

interface SchoolClass {
  id: string
  name: string
  sort_order: number
  student_count: number
}

interface Student {
  id: string
  class_id: string
  section_id: string | null
  student_code: string
  roll_number: string
  full_name: string
  full_name_bn: string | null
  date_of_birth: string | null
  guardian_name: string | null
  guardian_phone: string | null
  status: 'active' | 'inactive' | 'transferred'
  class_name: string
  section_name: string | null
}

interface Props {
  schoolId: string
  onNavigate: (id: string) => void
  initialStatus?: string
}

async function readError(response: Response) {
  const data = await response.json().catch(() => ({})) as { error?: string }
  return data.error || 'The request could not be completed.'
}

export function ClassesPage({ schoolId, onNavigate }: Props) {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [editing, setEditing] = useState<SchoolClass | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadClasses() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/school/classes?schoolId=${encodeURIComponent(schoolId)}`)
      if (!response.ok) throw new Error(await readError(response))
      const data = await response.json() as { classes: SchoolClass[] }
      setClasses(data.classes)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Classes could not be loaded.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadClasses() }, [schoolId])

  function startEdit(row: SchoolClass) {
    setEditing(row)
    setName(row.name)
    setSortOrder(String(row.sort_order))
    setError('')
  }

  function clearForm() {
    setEditing(null)
    setName('')
    setSortOrder('0')
    setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/school/classes?schoolId=${encodeURIComponent(schoolId)}`, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing?.id, name, sortOrder: Number(sortOrder) || 0 }),
      })
      if (!response.ok) throw new Error(await readError(response))
      clearForm()
      await loadClasses()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Class could not be saved.')
    } finally { setSaving(false) }
  }

  async function remove(row: SchoolClass) {
    if (!window.confirm(`Delete ${row.name}?`)) return
    setError('')
    try {
      const response = await fetch(`/api/school/classes?schoolId=${encodeURIComponent(schoolId)}&id=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await readError(response))
      await loadClasses()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Class could not be deleted.')
    }
  }

  return <section className="settings-page data-page">
    <div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ACADEMIC STRUCTURE</div><h1>Classes</h1><p>Set up grade levels before enrolling students.</p></div><button className="primary-button compact-action" onClick={() => { clearForm(); document.getElementById('class-name')?.focus() }}><Plus size={15} /> Add class</button></div>
    <div className="settings-card data-card">
      <div className="data-card-header"><div><h2>Class list</h2><p>{classes.length} {classes.length === 1 ? 'class' : 'classes'} configured</p></div><button className="text-action" onClick={() => onNavigate('sections')}>Manage houses / sections <ArrowLeft size={13} className="flip-icon" /></button></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="inline-data-form" onSubmit={submit}>
        <label htmlFor="class-name">{editing ? 'Edit class' : 'New class'}</label>
        <input id="class-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Class One" required maxLength={60} />
        <label className="order-label" htmlFor="class-order">Order</label><input id="class-order" type="number" min="0" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
        <button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save class' : 'Add class'}</button>
        {editing && <button type="button" className="quiet-button" onClick={clearForm}>Cancel</button>}
      </form>
      {loading ? <div className="data-empty">Loading classes…</div> : classes.length === 0 ? <div className="data-empty"><span className="empty-icon"><Users size={20} /></span><strong>No classes yet</strong><p>Create grade levels such as Class One, Class Two, or HSC 2026–2027.</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Class name</th><th>Students</th><th>Order</th><th>Actions</th></tr></thead><tbody>{classes.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.student_count}</td><td>{row.sort_order}</td><td className="row-actions"><button onClick={() => startEdit(row)}>Edit</button><button className="danger-text" onClick={() => void remove(row)} disabled={row.student_count > 0}>Delete</button></td></tr>)}</tbody></table></div>}
    </div>
  </section>
}

const emptyStudent = { fullName: '', studentCode: '', rollNumber: '', classId: '', fullNameBn: '', dateOfBirth: '', guardianName: '', guardianPhone: '' }

export function StudentsPage({ schoolId, onNavigate, initialStatus = 'active' }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [form, setForm] = useState(emptyStudent)
  const [editing, setEditing] = useState<Student | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [classResponse, studentResponse] = await Promise.all([
        fetch(`/api/school/classes?schoolId=${encodeURIComponent(schoolId)}`),
        fetch(`/api/school/students?schoolId=${encodeURIComponent(schoolId)}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`),
      ])
      if (!classResponse.ok) throw new Error(await readError(classResponse))
      if (!studentResponse.ok) throw new Error(await readError(studentResponse))
      const classData = await classResponse.json() as { classes: SchoolClass[] }
      const studentData = await studentResponse.json() as { students: Student[] }
      setClasses(classData.classes)
      setStudents(studentData.students)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Student records could not be loaded.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadData() }, [schoolId, search, status])

  function editStudent(student: Student) {
    setEditing(student)
    setForm({ fullName: student.full_name, studentCode: student.student_code, rollNumber: student.roll_number, classId: student.class_id, fullNameBn: student.full_name_bn || '', dateOfBirth: student.date_of_birth || '', guardianName: student.guardian_name || '', guardianPhone: student.guardian_phone || '' })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setForm(emptyStudent)
    setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const body = {
      ...form,
      id: editing?.id,
      status: editing?.status || 'active',
      sectionId: editing?.section_id || '',
    }
    try {
      const response = await fetch(`/api/school/students?schoolId=${encodeURIComponent(schoolId)}`, {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(await readError(response))
      closeForm()
      await loadData()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Student could not be saved.')
    } finally { setSaving(false) }
  }

  async function setStudentStatus(student: Student) {
    const nextStatus = student.status === 'active' ? 'inactive' : 'active'
    if (nextStatus === 'inactive' && !window.confirm(`Mark ${student.full_name} inactive?`)) return
    setError('')
    try {
      const response = await fetch(`/api/school/students?schoolId=${encodeURIComponent(schoolId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, fullName: student.full_name, studentCode: student.student_code, rollNumber: student.roll_number, classId: student.class_id, sectionId: student.section_id || '', fullNameBn: student.full_name_bn || '', dateOfBirth: student.date_of_birth || '', guardianName: student.guardian_name || '', guardianPhone: student.guardian_phone || '', status: nextStatus }),
      })
      if (!response.ok) throw new Error(await readError(response))
      await loadData()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Student status could not be updated.')
    }
  }

  return <section className="settings-page data-page">
    <div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> STUDENT INFORMATION</div><h1>Students</h1><p>Manage student records for your school. DigiVerse supports up to 500 active students.</p></div><button className="primary-button compact-action" onClick={() => { setForm(emptyStudent); setEditing(null); setFormOpen(!formOpen); setError('') }}><Plus size={15} /> Add student</button></div>
    <div className="settings-card data-card">
      <div className="data-card-header"><div><h2>Student directory</h2><p>{students.length} records shown</p></div><div className="data-filters"><label className="student-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, roll…" /></label><select aria-label="Filter by student status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active students</option><option value="inactive">Inactive</option><option value="transferred">Transferred</option><option value="all">All students</option></select></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {formOpen && <form className="student-form" onSubmit={submit}><div className="student-form-heading"><strong>{editing ? 'Edit student record' : 'Add a student'}</strong><button type="button" aria-label="Close form" className="icon-button" onClick={closeForm}><X size={16} /></button></div><div className="student-form-grid">
        <label>Full name<input required maxLength={120} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Student ID<input required maxLength={40} value={form.studentCode} onChange={(e) => setForm({ ...form, studentCode: e.target.value })} /></label>
        <label>Roll number<input required maxLength={30} value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} /></label>
        <label>Class<select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}><option value="">Choose a class</option>{classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
        <label>Bangla name <span className="optional-label">Optional</span><input maxLength={120} value={form.fullNameBn} onChange={(e) => setForm({ ...form, fullNameBn: e.target.value })} /></label>
        <label>Date of birth <span className="optional-label">Optional</span><input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></label>
        <label>Guardian name <span className="optional-label">Optional</span><input maxLength={120} value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></label>
        <label>Guardian phone <span className="optional-label">Optional</span><input type="tel" maxLength={32} value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} /></label>
      </div><div className="student-form-actions"><button className="primary-button" disabled={saving || classes.length === 0}>{saving ? 'Saving…' : editing ? 'Save student' : 'Create student'}</button><button type="button" className="quiet-button" onClick={closeForm}>Cancel</button>{classes.length === 0 && <button type="button" className="text-action" onClick={() => onNavigate('classes')}>Create a class first</button>}</div></form>}
      {loading ? <div className="data-empty">Loading student records…</div> : students.length === 0 ? <div className="data-empty"><span className="empty-icon"><Users size={20} /></span><strong>No students found</strong><p>{search ? 'Try another search.' : classes.length ? 'Add a student to begin your directory.' : 'Create at least one class before enrolling students.'}</p>{!classes.length && <button className="text-action" onClick={() => onNavigate('classes')}>Go to classes</button>}</div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Student</th><th>Student ID</th><th>Class / roll</th><th>Guardian</th><th>Status</th><th>Actions</th></tr></thead><tbody>{students.map((student) => <tr key={student.id}><td><strong>{student.full_name}</strong>{student.full_name_bn && <small className="cell-subtitle">{student.full_name_bn}</small>}</td><td>{student.student_code}</td><td>{student.class_name}<small className="cell-subtitle">Roll {student.roll_number}{student.section_name ? ` · ${student.section_name}` : ''}</small></td><td>{student.guardian_name || '—'}<small className="cell-subtitle">{student.guardian_phone || ''}</small></td><td><span className={`student-status status-${student.status}`}>{student.status}</span></td><td className="row-actions"><button onClick={() => editStudent(student)}>Edit</button><button className={student.status === 'active' ? 'danger-text' : ''} onClick={() => void setStudentStatus(student)}>{student.status === 'active' ? 'Mark inactive' : 'Activate'}</button></td></tr>)}</tbody></table></div>}
    </div>
  </section>
}

interface Teacher {
  id: string; employee_code: string; full_name: string; full_name_bn: string | null
  email: string | null; phone: string | null; designation: string | null
  joining_date: string | null; status: 'active' | 'inactive'
}

const emptyTeacher = { fullName: '', employeeCode: '', fullNameBn: '', email: '', phone: '', designation: '', joiningDate: '' }

export function TeachersPage({ schoolId }: Props) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [form, setForm] = useState(emptyTeacher)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadTeachers() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/school/teachers?schoolId=${encodeURIComponent(schoolId)}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`)
      if (!response.ok) throw new Error(await readError(response))
      const data = await response.json() as { teachers: Teacher[] }
      setTeachers(data.teachers)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Teacher records could not be loaded.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void loadTeachers() }, [schoolId, status, search])

  function startEdit(teacher: Teacher) {
    setEditing(teacher)
    setForm({ fullName: teacher.full_name, employeeCode: teacher.employee_code, fullNameBn: teacher.full_name_bn || '', email: teacher.email || '', phone: teacher.phone || '', designation: teacher.designation || '', joiningDate: teacher.joining_date || '' })
    setFormOpen(true); setError('')
  }

  function closeForm() { setFormOpen(false); setEditing(null); setForm(emptyTeacher); setError('') }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const response = await fetch(`/api/school/teachers?schoolId=${encodeURIComponent(schoolId)}`, {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editing?.id, status: editing?.status || 'active' }),
      })
      if (!response.ok) throw new Error(await readError(response))
      closeForm(); await loadTeachers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Teacher could not be saved.') }
    finally { setSaving(false) }
  }

  async function changeStatus(teacher: Teacher) {
    const nextStatus = teacher.status === 'active' ? 'inactive' : 'active'
    if (nextStatus === 'inactive' && !window.confirm(`Mark ${teacher.full_name} inactive?`)) return
    try {
      const response = await fetch(`/api/school/teachers?schoolId=${encodeURIComponent(schoolId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teacher.id, employeeCode: teacher.employee_code, fullName: teacher.full_name, fullNameBn: teacher.full_name_bn || '', email: teacher.email || '', phone: teacher.phone || '', designation: teacher.designation || '', joiningDate: teacher.joining_date || '', status: nextStatus }),
      })
      if (!response.ok) throw new Error(await readError(response))
      await loadTeachers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Teacher status could not be updated.') }
  }

  return <section className="settings-page data-page">
    <div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> STAFF DIRECTORY</div><h1>Teachers</h1><p>Manage teacher profiles and employment status for your school.</p></div><button className="primary-button compact-action" onClick={() => { setForm(emptyTeacher); setEditing(null); setFormOpen(!formOpen); setError('') }}><Plus size={15} /> Add teacher</button></div>
    <div className="settings-card data-card">
      <div className="data-card-header"><div><h2>Teacher directory</h2><p>{teachers.length} records shown</p></div><div className="data-filters"><label className="student-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, role…" /></label><select aria-label="Filter by teacher status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active teachers</option><option value="inactive">Inactive</option><option value="all">All teachers</option></select></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {formOpen && <form className="student-form" onSubmit={submit}><div className="student-form-heading"><strong>{editing ? 'Edit teacher profile' : 'Add a teacher'}</strong><button type="button" aria-label="Close form" className="icon-button" onClick={closeForm}><X size={16} /></button></div><div className="student-form-grid">
        <label>Full name<input required maxLength={120} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Employee ID<input required maxLength={40} value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></label>
        <label>Designation<input maxLength={80} placeholder="e.g. Mathematics teacher" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></label>
        <label>Phone<input type="tel" maxLength={32} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Email<input type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Joining date<input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></label>
        <label>Bangla name <span className="optional-label">Optional</span><input maxLength={120} value={form.fullNameBn} onChange={(e) => setForm({ ...form, fullNameBn: e.target.value })} /></label>
      </div><div className="student-form-actions"><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save teacher' : 'Create teacher'}</button><button type="button" className="quiet-button" onClick={closeForm}>Cancel</button></div></form>}
      {loading ? <div className="data-empty">Loading teacher records…</div> : teachers.length === 0 ? <div className="data-empty"><span className="empty-icon"><Users size={20} /></span><strong>No teachers found</strong><p>{search ? 'Try another search.' : 'Add your first teacher profile to build the staff directory.'}</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Teacher</th><th>Employee ID</th><th>Contact</th><th>Designation</th><th>Joining date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{teachers.map((teacher) => <tr key={teacher.id}><td><strong>{teacher.full_name}</strong>{teacher.full_name_bn && <small className="cell-subtitle">{teacher.full_name_bn}</small>}</td><td>{teacher.employee_code}</td><td><span className="teacher-contact">{teacher.email && <span><Mail size={12} />{teacher.email}</span>}{teacher.phone && <span><Phone size={12} />{teacher.phone}</span>}{!teacher.email && !teacher.phone && '—'}</span></td><td>{teacher.designation || '—'}</td><td>{teacher.joining_date || '—'}</td><td><span className={`student-status status-${teacher.status}`}>{teacher.status}</span></td><td className="row-actions"><button onClick={() => startEdit(teacher)}>Edit</button><button className={teacher.status === 'active' ? 'danger-text' : ''} onClick={() => void changeStatus(teacher)}>{teacher.status === 'active' ? 'Mark inactive' : 'Activate'}</button></td></tr>)}</tbody></table></div>}
    </div>
  </section>
}
