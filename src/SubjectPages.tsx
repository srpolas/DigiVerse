import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { BookOpen, Check, GraduationCap, Plus, Search, Settings2, Users, X } from 'lucide-react'

interface SchoolClass { id: string; name: string; sort_order: number; status: string }
interface TeacherChoice { id: string; full_name: string; employee_code: string }
interface SubjectRecord {
  id: string; name: string; code: string | null; numerical_number: number | null; amount: number
  group_names: string; bind_subject_id: string | null; teacher_id: string | null; teacher_name: string | null
  marking_types: string; status: 'active' | 'inactive'; assigned_classes: string
}
interface SubjectChoice { id: string; name: string; code: string | null; numerical_number: number | null; group_names?: string; amount?: number; teacher_id?: string | null; teacher_name?: string | null; status?: string }
interface StudentRecord {
  id: string; student_code: string; roll_number: string; full_name: string; full_name_bn: string | null
  section_id: string | null; group_name: string; guardian_name: string | null; guardian_phone: string | null
  customized: number; subject_ids: string[]
}
interface Props { schoolId: string; onNavigate: (id: string) => void }

const groupOptions = ['Common', 'Science', 'Humanities', 'Business Studies']

async function errorMessage(response: Response) {
  const result = await response.json().catch(() => ({})) as { error?: string }
  return result.error || 'The request could not be completed.'
}

function SubjectNavigation({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
  const links = [
    { id: 'subjects.list', label: 'Subjects', icon: BookOpen },
    { id: 'subjects.assign', label: 'Assigned subjects', icon: Settings2 },
    { id: 'subjects.students', label: 'Student subject assign', icon: GraduationCap },
  ]
  return <nav className="subject-page-nav" aria-label="Subject management">
    {links.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'selected' : ''} onClick={() => onNavigate(id)}><Icon size={15} />{label}</button>)}
  </nav>
}

function useSubjectData(schoolId: string) {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<TeacherChoice[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  async function load() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/school/subjects?schoolId=${encodeURIComponent(schoolId)}`)
      if (!response.ok) throw new Error(await errorMessage(response))
      const data = await response.json() as { subjects: SubjectRecord[]; classes: SchoolClass[]; teachers: TeacherChoice[] }
      setSubjects(data.subjects); setClasses(data.classes); setTeachers(data.teachers)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Subjects could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [schoolId])
  return { subjects, classes, teachers, error, setError, loading, load }
}

const blankSubject = { name: '', code: '', numericalNumber: '', amount: '0', groups: [] as string[], bindSubjectId: '', teacherId: '', markingTypesText: 'Written\nMCQ', classIds: [] as string[], status: 'active' as 'active' | 'inactive' }

export function SubjectsPage({ schoolId, onNavigate }: Props) {
  const data = useSubjectData(schoolId)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [form, setForm] = useState(blankSubject)
  const [editingId, setEditingId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const shown = useMemo(() => data.subjects.filter((subject) => {
    const matchesSearch = !search || `${subject.name} ${subject.code || ''}`.toLowerCase().includes(search.toLowerCase())
    const assignedClasses = JSON.parse(subject.assigned_classes || '[]') as { id: string }[]
    return matchesSearch && (statusFilter === 'all' || subject.status === statusFilter) && (!classFilter || assignedClasses.some((entry) => entry.id === classFilter))
  }), [data.subjects, search, classFilter, statusFilter])

  function beginEdit(subject: SubjectRecord) {
    const assignedClasses = JSON.parse(subject.assigned_classes || '[]') as { id: string }[]
    let groups: string[] = []; let marking: string[] = []
    try { groups = JSON.parse(subject.group_names || '[]') } catch { /* use an empty group list */ }
    try { marking = JSON.parse(subject.marking_types || '[]') } catch { /* use defaults */ }
    setEditingId(subject.id)
    setForm({ name: subject.name, code: subject.code || '', numericalNumber: subject.numerical_number == null ? '' : String(subject.numerical_number), amount: String(subject.amount || 0), groups, bindSubjectId: subject.bind_subject_id || '', teacherId: subject.teacher_id || '', markingTypesText: marking.join('\n') || 'Written\nMCQ', classIds: assignedClasses.map((entry) => entry.id), status: subject.status })
    setFormOpen(true); setActionError('')
  }
  function startNew() { setEditingId(''); setForm(blankSubject); setFormOpen(!formOpen); setActionError('') }
  function closeForm() { setFormOpen(false); setEditingId(''); setForm(blankSubject); setActionError('') }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setActionError('')
    try {
      const response = await fetch(`/api/school/subjects?schoolId=${encodeURIComponent(schoolId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editingId || undefined, numericalNumber: form.numericalNumber, amount: form.amount, markingTypes: form.markingTypesText.split('\n').map((value) => value.trim()).filter(Boolean) }),
      })
      if (!response.ok) throw new Error(await errorMessage(response))
      closeForm(); await data.load()
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Subject could not be saved.') }
    finally { setSaving(false) }
  }
  async function remove(subject: SubjectRecord) {
    if (!window.confirm(`Delete ${subject.name}? Subjects already used by students must be deactivated to preserve records.`)) return
    try {
      const response = await fetch(`/api/school/subjects?schoolId=${encodeURIComponent(schoolId)}&id=${encodeURIComponent(subject.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await errorMessage(response))
      await data.load()
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Subject could not be deleted.') }
  }

  return <section className="settings-page data-page subject-page">
    <div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ACADEMIC SETUP</div><h1>Subjects</h1><p>Build your subject catalogue, then assign subjects to classes and students.</p></div><button className="primary-button compact-action" onClick={startNew}><Plus size={15} /> Add subject</button></div>
    <SubjectNavigation active="subjects.list" onNavigate={onNavigate} />
    <div className="settings-card data-card">
      <div className="data-card-header"><div><h2>Subject catalogue</h2><p>{shown.length} subjects shown · {data.subjects.length} total</p></div><div className="subject-filters"><label className="student-search"><Search size={15} /><input aria-label="Search subjects" placeholder="Find subject or code" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label="Filter by class" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="">All classes</option>{data.classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All statuses</option></select></div></div>
      {(data.error || actionError) && <div className="form-error" role="alert">{actionError || data.error}</div>}
      {formOpen && <form className="subject-form" onSubmit={submit}><div className="subject-form-heading"><div><strong>{editingId ? 'Edit subject' : 'Add a subject'}</strong><small>Enter subject information and choose the classes where it is offered.</small></div><button type="button" aria-label="Close subject form" className="icon-button" onClick={closeForm}><X size={16} /></button></div>
        <div className="subject-form-grid"><label>Subject name *<input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" /></label><label>Subject code<input maxLength={30} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH-01" /></label><label>Numerical number<input type="number" min="0" max="9999" value={form.numericalNumber} onChange={(e) => setForm({ ...form, numericalNumber: e.target.value })} /></label><label>Amount / fee<input type="number" min="0" max="1000000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label>Related subject<select value={form.bindSubjectId} onChange={(e) => setForm({ ...form, bindSubjectId: e.target.value })}><option value="">None</option>{data.subjects.filter((entry) => entry.id !== editingId).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><small>Link a paired or alternative subject.</small></label><label>In-charge teacher<select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}><option value="">Not assigned</option>{data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name} · {teacher.employee_code}</option>)}</select></label><label className="subject-wide-field">Groups <small>Leave all unchecked if the subject is for every group.</small><span className="subject-choice-row">{groupOptions.map((group) => <label key={group}><input type="checkbox" checked={form.groups.includes(group)} onChange={(e) => setForm({ ...form, groups: e.target.checked ? [...form.groups, group] : form.groups.filter((entry) => entry !== group) })} />{group}</label>)}</span></label><label className="subject-wide-field">Classes *<small>Select every class that offers this subject.</small><span className="subject-choice-row">{data.classes.filter((entry) => entry.status !== 'inactive' || form.classIds.includes(entry.id)).map((entry) => <label key={entry.id}><input type="checkbox" checked={form.classIds.includes(entry.id)} onChange={(e) => setForm({ ...form, classIds: e.target.checked ? [...form.classIds, entry.id] : form.classIds.filter((id) => id !== entry.id) })} />{entry.name}</label>)}</span></label><label>Exam marking types<small>One marking type per line.</small><textarea rows={4} value={form.markingTypesText} onChange={(e) => setForm({ ...form, markingTypesText: e.target.value })} placeholder={'Written\nMCQ\nPractical'} /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
        {actionError && <div className="form-error" role="alert">{actionError}</div>}<div className="student-form-actions"><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save subject' : 'Create subject'}</button><button type="button" className="quiet-button" onClick={closeForm}>Cancel</button></div>
      </form>}
      {data.loading ? <div className="data-empty">Loading subjects…</div> : shown.length === 0 ? <div className="data-empty"><span className="empty-icon"><BookOpen size={20} /></span><strong>No subjects found</strong><p>{data.classes.length ? 'Add a subject to begin your catalogue, then assign it to classes.' : 'Set up a class before creating subjects.'}</p></div> : <div className="table-scroll"><table className="data-table subject-table"><thead><tr><th>Subject</th><th>Code</th><th>Number</th><th>Amount</th><th>Classes</th><th>Groups</th><th>Marking types</th><th>Related subject</th><th>Teacher</th><th>Status</th><th>Actions</th></tr></thead><tbody>{shown.map((subject) => { const assignedClasses = JSON.parse(subject.assigned_classes || '[]') as { id: string; name: string }[]; let groups: string[] = []; let markingTypes: string[] = []; try { groups = JSON.parse(subject.group_names || '[]') } catch { /* empty group */ } try { markingTypes = JSON.parse(subject.marking_types || '[]') } catch { /* empty marking types */ } return <tr key={subject.id}><td><strong>{subject.name}</strong></td><td>{subject.code || '—'}</td><td>{subject.numerical_number ?? '—'}</td><td>{subject.amount || '—'}</td><td>{assignedClasses.map((entry) => entry.name).join(', ') || '—'}</td><td>{groups.join(', ') || 'All groups'}</td><td>{markingTypes.join(', ') || '—'}</td><td>{data.subjects.find((entry) => entry.id === subject.bind_subject_id)?.name || '—'}</td><td>{subject.teacher_name || '—'}</td><td><span className={`student-status ${subject.status === 'inactive' ? 'status-inactive' : ''}`}>{subject.status}</span></td><td className="row-actions"><button onClick={() => beginEdit(subject)}>Edit</button><button className="danger-text" onClick={() => void remove(subject)}>Delete</button></td></tr> })}</tbody></table></div>}
    </div>
  </section>
}

interface ClassAssignment { id: string; name: string; sort_order: number; status: string }
interface AssignedRow extends SubjectChoice { assignment_id: string; teacher_id: string | null; teacher_name: string; student_count: number }

export function AssignedSubjectsPage({ schoolId, onNavigate }: Props) {
  const [classes, setClasses] = useState<ClassAssignment[]>([])
  const [subjects, setSubjects] = useState<SubjectChoice[]>([])
  const [teachers, setTeachers] = useState<TeacherChoice[]>([])
  const [assigned, setAssigned] = useState<AssignedRow[]>([])
  const [classId, setClassId] = useState('')
  const [teacherChoices, setTeacherChoices] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const [subjectResponse, classResponse] = await Promise.all([
        fetch(`/api/school/subjects?schoolId=${encodeURIComponent(schoolId)}`),
        fetch(`/api/school/subjects/assignments?schoolId=${encodeURIComponent(schoolId)}${classId ? `&classId=${encodeURIComponent(classId)}` : ''}`),
      ])
      if (!subjectResponse.ok) throw new Error(await errorMessage(subjectResponse))
      if (!classResponse.ok) throw new Error(await errorMessage(classResponse))
      const subjectData = await subjectResponse.json() as { subjects: SubjectRecord[]; teachers: TeacherChoice[] }
      const classData = await classResponse.json() as { classes: ClassAssignment[]; assigned: AssignedRow[] }
      setSubjects(subjectData.subjects.filter((subject) => subject.status === 'active'))
      setTeachers(subjectData.teachers); setClasses(classData.classes); setAssigned(classData.assigned)
      if (!classId && classData.classes.length) setClassId(classData.classes.find((entry) => entry.status === 'active')?.id || classData.classes[0].id)
      setTeacherChoices(Object.fromEntries(classData.assigned.map((entry) => [entry.id, entry.teacher_id || ''])))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Assigned subjects could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [schoolId, classId])
  const assignedIds = new Set(assigned.map((entry) => entry.id))

  async function toggle(subject: SubjectChoice, checked: boolean) {
    if (!classId) return
    setBusyId(subject.id); setError('')
    try {
      const response = await fetch(`/api/school/subjects/assignments?schoolId=${encodeURIComponent(schoolId)}${checked ? '' : `&classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subject.id)}`}`, {
        method: checked ? 'POST' : 'DELETE', headers: checked ? { 'Content-Type': 'application/json' } : undefined,
        body: checked ? JSON.stringify({ classId, subjectId: subject.id, teacherId: subject.teacher_id || '' }) : undefined,
      })
      if (!response.ok) throw new Error(await errorMessage(response))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Class subject could not be updated.') }
    finally { setBusyId('') }
  }
  async function setTeacher(subject: SubjectChoice, teacherId: string) {
    setTeacherChoices((current) => ({ ...current, [subject.id]: teacherId })); setBusyId(subject.id); setError('')
    try {
      const response = await fetch(`/api/school/subjects/assignments?schoolId=${encodeURIComponent(schoolId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId, subjectId: subject.id, teacherId }) })
      if (!response.ok) throw new Error(await errorMessage(response))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Teacher assignment could not be updated.') }
    finally { setBusyId('') }
  }

  return <section className="settings-page data-page subject-page"><div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> CLASS CURRICULUM</div><h1>Assigned subjects</h1><p>Choose a class, then add the subjects and in-charge teachers it needs.</p></div></div><SubjectNavigation active="subjects.assign" onNavigate={onNavigate} /><div className="settings-card data-card"><div className="subject-class-toolbar"><label>Class<select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Choose a class</option>{classes.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}</select></label><div className="subject-assignment-summary"><strong>{assigned.length}</strong><span>subjects assigned</span></div></div>{error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="data-empty">Loading class curriculum…</div> : !classId ? <div className="data-empty">Create a class first to assign subjects.</div> : subjects.length === 0 ? <div className="data-empty">Create active subjects before assigning a class curriculum.</div> : <div className="subject-assignment-list">{subjects.map((subject) => { const isAssigned = assignedIds.has(subject.id); const row = assigned.find((entry) => entry.id === subject.id); return <article className={`subject-assignment-row ${isAssigned ? 'is-assigned' : ''}`} key={subject.id}><label className="subject-assignment-check"><input type="checkbox" checked={isAssigned} disabled={busyId === subject.id} onChange={(event) => void toggle(subject, event.target.checked)} /><span className="subject-assignment-icon"><BookOpen size={16} /></span><span><strong>{subject.name}</strong><small>{subject.code || 'No code'}{subject.numerical_number != null ? ` · No. ${subject.numerical_number}` : ''}</small></span></label><span className="subject-assignment-students"><Users size={14} /> {row?.student_count || 0} students</span><label className="subject-assignment-teacher">In-charge teacher<select aria-label={`In-charge teacher for ${subject.name}`} disabled={!isAssigned || busyId === subject.id} value={isAssigned ? (teacherChoices[subject.id] ?? row?.teacher_id ?? subject.teacher_id ?? '') : ''} onChange={(event) => void setTeacher(subject, event.target.value)}><option value="">Use subject default</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select></label></article> })}</div>}</div></section>
}

export function StudentSubjectAssignPage({ schoolId, onNavigate }: Props) {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [subjects, setSubjects] = useState<SubjectChoice[]>([])
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<StudentRecord | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch(`/api/school/classes?schoolId=${encodeURIComponent(schoolId)}`).then(async (response) => {
      if (!response.ok) throw new Error(await errorMessage(response))
      const result = await response.json() as { classes: SchoolClass[] }; setClasses(result.classes)
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Classes could not be loaded.'))
  }, [schoolId])

  async function loadStudents() {
    if (!classId) { setStudents([]); setSubjects([]); return }
    setLoading(true); setError('')
    try {
      const query = new URLSearchParams({ schoolId, classId, search, groupName, ...(sectionId ? { sectionId } : {}) })
      const response = await fetch(`/api/school/subjects/students?${query}`)
      if (!response.ok) throw new Error(await errorMessage(response))
      const result = await response.json() as { students: StudentRecord[]; subjects: SubjectChoice[]; sections: { id: string; name: string }[] }
      setStudents(result.students); setSubjects(result.subjects); setSections(result.sections)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Students could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void loadStudents() }, [schoolId, classId, sectionId, groupName, search])

  const editableSubjects = useMemo(() => subjects.filter((subject) => {
    try { const groups = JSON.parse(subject.group_names || '[]') as string[]; return !groups.length || groups.includes(editing?.group_name || '') || groups.includes('Common') }
    catch { return true }
  }), [subjects, editing?.group_name])
  function editStudent(student: StudentRecord) { setEditing(student); setSelected(student.subject_ids); setError('') }
  async function saveStudentSubjects(resetToDefault = false) {
    if (!editing) return
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/school/subjects/students?schoolId=${encodeURIComponent(schoolId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: editing.id, subjectIds: selected, resetToDefault }) })
      if (!response.ok) throw new Error(await errorMessage(response))
      setEditing(null); await loadStudents()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Student subjects could not be saved.') }
    finally { setSaving(false) }
  }

  return <section className="settings-page data-page subject-page"><div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> STUDENT CURRICULUM</div><h1>Student subject assign</h1><p>Students start with their class subjects; customize an individual student's subjects when needed.</p></div></div><SubjectNavigation active="subjects.students" onNavigate={onNavigate} /><div className="settings-card data-card"><div className="student-subject-filters"><label>Class<select value={classId} onChange={(event) => { setClassId(event.target.value); setSectionId('') }}><option value="">Choose a class</option>{classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label>House / section<select value={sectionId} onChange={(event) => setSectionId(event.target.value)} disabled={!classId}><option value="">All houses</option>{sections.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label>Group<select value={groupName} onChange={(event) => setGroupName(event.target.value)}><option value="">All groups</option>{groupOptions.map((group) => <option key={group}>{group}</option>)}</select></label><label>Find student<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, ID or roll" /></label></div>{error && <div className="form-error" role="alert">{error}</div>}
    {classId && subjects.length === 0 && !loading ? <div className="subject-empty-guidance"><span className="empty-icon"><BookOpen size={18} /></span><div><strong>No subjects assigned to this class yet</strong><p>Assign class subjects first, then customize student subject lists here.</p><button className="text-action" onClick={() => onNavigate('subjects.assign')}>Open assigned subjects</button></div></div> : null}
    {loading ? <div className="data-empty">Loading students…</div> : !classId ? <div className="data-empty">Choose a class to find students and manage their subjects.</div> : students.length === 0 && subjects.length ? <div className="data-empty"><Users size={20} /><strong>No students match these filters</strong></div> : students.length > 0 ? <><div className="subject-student-summary"><strong>{students.length} students</strong><span>{subjects.length} class subjects available</span></div><div className="table-scroll"><table className="data-table student-subject-table"><thead><tr><th>Roll</th><th>Student</th><th>Group</th><th>Assigned subjects</th><th>Assignment</th><th>Actions</th></tr></thead><tbody>{students.map((student) => { const assignedSubjects = subjects.filter((subject) => student.subject_ids.includes(subject.id)); return <tr key={student.id}><td>{student.roll_number}</td><td><strong>{student.full_name}</strong><small className="cell-subtitle">{student.student_code}{student.full_name_bn ? ` · ${student.full_name_bn}` : ''}</small></td><td>{student.group_name || 'Common'}</td><td><div className="subject-chip-list">{assignedSubjects.length ? assignedSubjects.map((subject) => <span key={subject.id}>{subject.name}</span>) : <small>No subjects selected</small>}</div></td><td><span className={`subject-source-pill ${student.customized ? 'custom' : ''}`}>{student.customized ? 'Customized' : 'Class default'}</span></td><td className="row-actions"><button onClick={() => editStudent(student)}>Manage</button></td></tr> })}</tbody></table></div></> : null}
    {editing && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditing(null) }}><section className="teacher-dialog student-subject-dialog" role="dialog" aria-modal="true" aria-labelledby="student-subject-title"><div className="student-form-heading"><div><div className="student-profile-kicker">SUBJECT SELECTION · {editing.student_code}</div><h2 id="student-subject-title">{editing.full_name}</h2><p>Roll {editing.roll_number} · {editing.group_name || 'Common'} · {selected.length} of {editableSubjects.length} available selected</p></div><button aria-label="Close assignment dialog" className="icon-button" onClick={() => setEditing(null)}><X size={16} /></button></div><div className="subject-dialog-tools"><button type="button" className="text-action" onClick={() => setSelected(editableSubjects.map((subject) => subject.id))}>Select all available subjects</button><button type="button" className="text-action" onClick={() => setSelected([])}>Clear selection</button></div><div className="student-subject-choice-list">{editableSubjects.map((subject) => <label key={subject.id} className={selected.includes(subject.id) ? 'chosen' : ''}><input type="checkbox" checked={selected.includes(subject.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, subject.id] : selected.filter((id) => id !== subject.id))} /><span><strong>{subject.name}</strong><small>{subject.code || 'No code'}{subject.numerical_number != null ? ` · No. ${subject.numerical_number}` : ''}</small></span><Check size={16} /></label>)}</div><div className="student-form-actions"><button className="primary-button" disabled={saving} onClick={() => void saveStudentSubjects()}>{saving ? 'Saving…' : 'Save student subjects'}</button>{editing.customized === 1 && <button className="quiet-button" disabled={saving} onClick={() => void saveStudentSubjects(true)}>Use class default</button>}<button className="quiet-button" disabled={saving} onClick={() => setEditing(null)}>Cancel</button></div></section></div>}
  </div></section>
}
