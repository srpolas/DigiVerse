import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Download, Eye, Mail, Phone, Plus, Search, Users, X } from 'lucide-react'

interface SchoolClass {
  id: string
  name: string
  sort_order: number
  student_count: number
  total_student_count: number
  section_count: number
  class_type: 'standard' | 'individual' | 'common'
  auto_attendance: number
  id_card_file: string | null
  status: 'active' | 'inactive'
}

interface SchoolSection {
  id: string; class_id: string; class_name?: string; name: string; house_code: string | null
  nickname: string | null; teacher_id: string | null; teacher_name: string | null; shift: string
  sort_order: number; status: 'active' | 'inactive'; student_count: number
}
interface TeacherChoice { id: string; full_name: string; employee_code: string }

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
  gender: string | null; father_name: string | null; father_phone: string | null
  mother_name: string | null; mother_phone: string | null; student_phone: string | null
  email: string | null; nickname: string | null; blood_group: string | null; religion: string | null
  group_name: string; birth_certificate_number: string | null; previous_institute_name: string | null; session: string | null
  present_village: string | null; present_district: string | null; present_thana: string | null
  present_post_office: string | null; present_holding: string | null; permanent_village: string | null
  permanent_district: string | null; permanent_thana: string | null; permanent_post_office: string | null; permanent_holding: string | null
  father_nid: string | null; father_occupation: string | null; mother_nid: string | null; mother_occupation: string | null
  father_name_bn: string | null; mother_name_bn: string | null; family_yearly_income: number | null
  class_registration_number: string | null; board_registration: string | null; board_roll: string | null
  public_exam_name: string | null; public_exam_roll: string | null; public_exam_registration_number: string | null
  ssc_session: string | null; public_exam_gpa: number | null; public_exam_grade: string | null; ssc_passing_year: number | null
  same_as_present_address: number; photo_object_key: string | null
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
  const [search, setSearch] = useState('')
  const [classType, setClassType] = useState<SchoolClass['class_type']>('standard')
  const [autoAttendance, setAutoAttendance] = useState(false)
  const [idCardFile, setIdCardFile] = useState('')
  const [classStatus, setClassStatus] = useState<SchoolClass['status']>('active')

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

  const filteredClasses = classes.filter((row) => row.name.toLowerCase().includes(search.trim().toLowerCase()))
  const totalStudents = classes.reduce((total, row) => total + row.student_count, 0)
  const totalSections = classes.reduce((total, row) => total + row.section_count, 0)

  function startEdit(row: SchoolClass) {
    setEditing(row)
    setName(row.name)
    setSortOrder(String(row.sort_order))
    setClassType(row.class_type || 'standard')
    setAutoAttendance(Boolean(row.auto_attendance))
    setIdCardFile(row.id_card_file || '')
    setClassStatus(row.status || 'active')
    setError('')
  }

  function clearForm() {
    setEditing(null)
    setName('')
    setSortOrder('0')
    setClassType('standard')
    setAutoAttendance(false)
    setIdCardFile('')
    setClassStatus('active')
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
        body: JSON.stringify({ id: editing?.id, name, sortOrder: Number(sortOrder) || 0, classType, autoAttendance, idCardFile, status: classStatus }),
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
    <div className="class-overview-grid"><article className="class-overview-card"><span>Classes</span><strong>{classes.length}</strong><small>Grade levels configured</small></article><article className="class-overview-card"><span>Active students</span><strong>{totalStudents}</strong><small>Across all classes</small></article><article className="class-overview-card"><span>Sections</span><strong>{totalSections}</strong><small>Groups within classes</small></article></div>
    <div className="settings-card data-card">
      <div className="data-card-header"><div><h2>Class list</h2><p>{filteredClasses.length} of {classes.length} {classes.length === 1 ? 'class' : 'classes'} shown</p></div><div className="class-list-tools"><label className="student-search"><Search size={15} /><input aria-label="Search classes" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search classes…" /></label><button className="text-action" onClick={() => onNavigate('sections')}>Manage houses / sections <ArrowLeft size={13} className="flip-icon" /></button></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="class-settings-form" onSubmit={submit}>
        <div className="class-settings-heading"><div><strong>{editing ? `Edit ${editing.name}` : 'Add a class'}</strong><small>Set its name, category, and display order.</small></div>{editing && <button type="button" className="quiet-button" onClick={clearForm}>Cancel</button>}</div>
        <div className="class-settings-fields"><label>Class name<input id="class-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Class One or HSC 2026–2027" required maxLength={60} /></label><label>Class type<select value={classType} onChange={(event) => setClassType(event.target.value as SchoolClass['class_type'])}><option value="standard">Standard</option><option value="individual">Individual</option><option value="common">Common</option></select></label><label>Numerical order<input type="number" min="0" max="999" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} /></label><label>Status<select value={classStatus} onChange={(event) => setClassStatus(event.target.value as SchoolClass['status'])}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label className="class-card-file">ID card file or template path <span className="optional-label">Optional</span><input value={idCardFile} onChange={(event) => setIdCardFile(event.target.value)} placeholder="R2 object key or template path" maxLength={500} /></label></div>
        <div className="class-settings-footer"><label className="class-toggle"><input type="checkbox" checked={autoAttendance} onChange={(event) => setAutoAttendance(event.target.checked)} /><span><strong>Auto attendance</strong><small>Allow this class to be included in automated attendance workflows.</small></span></label><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save class settings' : 'Create class'}</button></div>
      </form>
      {loading ? <div className="data-empty">Loading classes…</div> : classes.length === 0 ? <div className="data-empty"><span className="empty-icon"><Users size={20} /></span><strong>No classes yet</strong><p>Create grade levels such as Class One, Class Two, or HSC 2026–2027.</p></div> : filteredClasses.length === 0 ? <div className="data-empty"><strong>No matching classes</strong><p>Try a different class name.</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Class</th><th>Type</th><th>Active students</th><th>Sections</th><th>Attendance</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead><tbody>{filteredClasses.map((row) => <tr key={row.id}><td><strong>{row.name}</strong>{row.id_card_file && <small className="cell-subtitle">ID card template set</small>}</td><td className="capitalize-cell">{row.class_type || 'standard'}</td><td>{row.student_count}</td><td>{row.section_count}</td><td>{row.auto_attendance ? 'Auto' : 'Manual'}</td><td><span className={`student-status ${row.status === 'inactive' ? 'status-inactive' : ''}`}>{row.status}</span></td><td>{row.sort_order}</td><td className="row-actions"><button onClick={() => startEdit(row)}>Edit</button><button className="danger-text" title={row.total_student_count > 0 ? 'This class has student records; transfer them before deleting' : 'Delete class'} onClick={() => void remove(row)} disabled={row.total_student_count > 0}>Delete</button></td></tr>)}</tbody></table></div>}
    </div>
  </section>
}

export function SectionsPage({ schoolId, onNavigate }: Props) {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [sections, setSections] = useState<SchoolSection[]>([])
  const [classId, setClassId] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [shift, setShift] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [houseStatus, setHouseStatus] = useState<'active' | 'inactive'>('active')
  const [teachers, setTeachers] = useState<TeacherChoice[]>([])
  const [editing, setEditing] = useState<SchoolSection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const [classResponse, sectionResponse, teacherResponse] = await Promise.all([
        fetch(`/api/school/classes?schoolId=${encodeURIComponent(schoolId)}`),
        fetch(`/api/school/sections?schoolId=${encodeURIComponent(schoolId)}`),
        fetch(`/api/school/teachers?schoolId=${encodeURIComponent(schoolId)}&status=active`),
      ])
      if (!classResponse.ok) throw new Error(await readError(classResponse))
      if (!sectionResponse.ok) throw new Error(await readError(sectionResponse))
      if (!teacherResponse.ok && teacherResponse.status !== 403) throw new Error(await readError(teacherResponse))
      const classData = await classResponse.json() as { classes: SchoolClass[] }
      const sectionData = await sectionResponse.json() as { sections: SchoolSection[] }
      const teacherData = teacherResponse.ok ? await teacherResponse.json() as { teachers: TeacherChoice[] } : { teachers: [] }
      setClasses(classData.classes); setSections(sectionData.sections)
      setTeachers(teacherData.teachers)
      if (!classId && classData.classes[0]) setClassId(classData.classes[0].id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sections could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [schoolId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const response = await fetch(`/api/school/sections?schoolId=${encodeURIComponent(schoolId)}`, {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing?.id, classId, name, nickname, teacherId, shift, sortOrder: Number(sortOrder) || 0, status: houseStatus }),
      })
      if (!response.ok) throw new Error(await readError(response))
      setName(''); setNickname(''); setTeacherId(''); setShift(''); setSortOrder('0'); setHouseStatus('active'); setEditing(null); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Section could not be saved.') }
    finally { setSaving(false) }
  }
  async function remove(section: SchoolSection) {
    if (!window.confirm(`Delete ${section.name} from ${section.class_name}?`)) return
    setError('')
    try {
      const response = await fetch(`/api/school/sections?schoolId=${encodeURIComponent(schoolId)}&id=${encodeURIComponent(section.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await readError(response))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Section could not be deleted.') }
  }
  const shown = sections.filter((section) => section.class_id === classId)
  const selectedClass = classes.find((entry) => entry.id === classId)
  return <section className="settings-page data-page">
    <div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ACADEMIC STRUCTURE</div><h1>Houses / sections</h1><p>Assign class houses, in-charge teachers, and shifts.</p></div><button className="quiet-button" onClick={() => onNavigate('classes')}>Back to classes</button></div>
    <div className="section-workspace">
      <aside className="settings-card section-class-list"><div className="section-list-heading"><span>CLASSES</span><strong>{classes.length}</strong></div>{classes.map((entry) => <button className={`section-class-choice ${entry.id === classId ? 'selected' : ''}`} key={entry.id} onClick={() => { setClassId(entry.id); setEditing(null); setName('') }}><span>{entry.name}<small>{entry.student_count} active students</small></span><b>{entry.section_count}</b></button>)}{classes.length === 0 && <p className="section-hint">Create a class before adding sections.</p>}</aside>
      <div className="settings-card data-card"><div className="data-card-header"><div><h2>{selectedClass ? `${selectedClass.name} sections` : 'Sections'}</h2><p>Sections only accept students enrolled in the selected class.</p></div></div>{error && <div className="form-error" role="alert">{error}</div>}
        <form className="house-form" onSubmit={submit}><div className="house-form-title"><div><strong>{editing ? `Edit ${editing.name}` : 'Add a house'}</strong><small>House code is generated automatically.</small></div>{editing && <button type="button" className="quiet-button" onClick={() => { setEditing(null); setName(''); setNickname(''); setTeacherId(''); setShift(''); setSortOrder('0'); setHouseStatus('active') }}>Cancel</button>}</div><div className="house-form-fields"><label>House name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} placeholder="e.g. Shondip A" /></label><label>Nickname <span className="optional-label">Optional</span><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={60} placeholder="Short name" /></label><label>In-charge teacher<select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}><option value="">No teacher assigned</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name} · {teacher.employee_code}</option>)}</select></label><label>Shift<select value={shift} onChange={(event) => setShift(event.target.value)}><option value="">Not set</option><option value="Morning">Morning</option><option value="Day">Day</option><option value="Evening">Evening</option></select></label><label>Numerical order<input type="number" min="0" max="999" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} /></label><label>Status<select value={houseStatus} onChange={(event) => setHouseStatus(event.target.value as 'active' | 'inactive')}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div><div className="house-form-footer"><small>House will be created under <strong>{selectedClass?.name || 'the selected class'}</strong></small><button className="primary-button" disabled={saving || !classId}>{saving ? 'Saving…' : editing ? 'Save house' : 'Add house'}</button></div></form>
        {loading ? <div className="data-empty">Loading houses…</div> : shown.length === 0 ? <div className="data-empty"><span className="empty-icon"><Users size={20} /></span><strong>No houses for this class</strong><p>Add a house above. Students can then be assigned to it from their student record.</p></div> : <div className="table-scroll"><table className="data-table house-table"><thead><tr><th>Code</th><th>House</th><th>Numerical no.</th><th>In-charge teacher</th><th>Shift</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead><tbody>{shown.map((section) => <tr key={section.id}><td><strong>{section.house_code || '—'}</strong></td><td><strong>{section.name}</strong>{section.nickname && <small className="cell-subtitle">{section.nickname}</small>}</td><td>{section.sort_order}</td><td>{section.teacher_name || '—'}</td><td>{section.shift || '—'}</td><td>{section.student_count}</td><td><span className={`student-status ${section.status === 'inactive' ? 'status-inactive' : ''}`}>{section.status}</span></td><td className="row-actions"><button onClick={() => { setEditing(section); setClassId(section.class_id); setName(section.name); setNickname(section.nickname || ''); setTeacherId(section.teacher_id || ''); setShift(section.shift || ''); setSortOrder(String(section.sort_order)); setHouseStatus(section.status || 'active') }}>Edit</button><button className="danger-text" disabled={section.student_count > 0} title={section.student_count ? 'Move students out of this house before deleting' : 'Delete house'} onClick={() => void remove(section)}>Delete</button></td></tr>)}</tbody></table></div>}
      </div>
    </div>
  </section>
}

const emptyStudent = {
  fullName: '', studentCode: '', rollNumber: '', classId: '', sectionId: '', fullNameBn: '', dateOfBirth: '',
  guardianName: '', guardianPhone: '', gender: '', fatherName: '', fatherPhone: '', motherName: '', motherPhone: '',
  studentPhone: '', email: '', nickname: '', bloodGroup: '', religion: '', groupName: 'Common',
  birthCertificateNumber: '', previousInstituteName: '', session: '', presentVillage: '', presentDistrict: '',
  presentThana: '', presentPostOffice: '', presentHolding: '', permanentVillage: '', permanentDistrict: '',
  permanentThana: '', permanentPostOffice: '', permanentHolding: '', fatherNid: '', fatherOccupation: '',
  motherNid: '', motherOccupation: '', fatherNameBn: '', motherNameBn: '', familyYearlyIncome: '',
  classRegistrationNumber: '', boardRegistration: '', boardRoll: '', publicExamName: '', publicExamRoll: '',
  publicExamRegistrationNumber: '', sscSession: '', publicExamGpa: '', publicExamGrade: '', sscPassingYear: '',
  sameAsPresentAddress: false,
}

function studentBody(student: Student, status: Student['status']) {
  return {
    id: student.id, fullName: student.full_name, studentCode: student.student_code, rollNumber: student.roll_number,
    classId: student.class_id, sectionId: student.section_id || '', fullNameBn: student.full_name_bn || '',
    dateOfBirth: student.date_of_birth || '', guardianName: student.guardian_name || '', guardianPhone: student.guardian_phone || '', status,
    gender: student.gender || '', fatherName: student.father_name || '', fatherPhone: student.father_phone || '',
    motherName: student.mother_name || '', motherPhone: student.mother_phone || '', studentPhone: student.student_phone || '',
    email: student.email || '', nickname: student.nickname || '', bloodGroup: student.blood_group || '', religion: student.religion || '',
    groupName: student.group_name || 'Common', birthCertificateNumber: student.birth_certificate_number || '',
    previousInstituteName: student.previous_institute_name || '', session: student.session || '', presentVillage: student.present_village || '',
    presentDistrict: student.present_district || '', presentThana: student.present_thana || '', presentPostOffice: student.present_post_office || '',
    presentHolding: student.present_holding || '', permanentVillage: student.permanent_village || '', permanentDistrict: student.permanent_district || '',
    permanentThana: student.permanent_thana || '', permanentPostOffice: student.permanent_post_office || '', permanentHolding: student.permanent_holding || '',
    fatherNid: student.father_nid || '', fatherOccupation: student.father_occupation || '', motherNid: student.mother_nid || '',
    motherOccupation: student.mother_occupation || '', fatherNameBn: student.father_name_bn || '', motherNameBn: student.mother_name_bn || '',
    familyYearlyIncome: student.family_yearly_income == null ? '' : String(student.family_yearly_income),
    classRegistrationNumber: student.class_registration_number || '', boardRegistration: student.board_registration || '', boardRoll: student.board_roll || '',
    publicExamName: student.public_exam_name || '', publicExamRoll: student.public_exam_roll || '',
    publicExamRegistrationNumber: student.public_exam_registration_number || '', sscSession: student.ssc_session || '',
    publicExamGpa: student.public_exam_gpa == null ? '' : String(student.public_exam_gpa), publicExamGrade: student.public_exam_grade || '',
    sscPassingYear: student.ssc_passing_year == null ? '' : String(student.ssc_passing_year), sameAsPresentAddress: Boolean(student.same_as_present_address),
  }
}

export function StudentsPage({ schoolId, onNavigate, initialStatus = 'active' }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [sections, setSections] = useState<SchoolSection[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [classFilter, setClassFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewing, setViewing] = useState<Student | null>(null)
  const [form, setForm] = useState(emptyStudent)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
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
        fetch(`/api/school/students?schoolId=${encodeURIComponent(schoolId)}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}&classId=${encodeURIComponent(classFilter)}&sectionId=${encodeURIComponent(sectionFilter)}&groupName=${encodeURIComponent(groupFilter)}`),
      ])
      if (!classResponse.ok) throw new Error(await readError(classResponse))
      if (!studentResponse.ok) throw new Error(await readError(studentResponse))
      const classData = await classResponse.json() as { classes: SchoolClass[] }
      const studentData = await studentResponse.json() as { students: Student[] }
      const sectionResponse = await fetch(`/api/school/sections?schoolId=${encodeURIComponent(schoolId)}`)
      if (!sectionResponse.ok) throw new Error(await readError(sectionResponse))
      const sectionData = await sectionResponse.json() as { sections: SchoolSection[] }
      setClasses(classData.classes)
      setSections(sectionData.sections)
      setStudents(studentData.students)
      setSelectedIds([])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Student records could not be loaded.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadData() }, [schoolId, search, status, classFilter, sectionFilter, groupFilter])

  function editStudent(student: Student) {
    setEditing(student)
    setForm({
      ...emptyStudent, fullName: student.full_name, studentCode: student.student_code, rollNumber: student.roll_number,
      classId: student.class_id, sectionId: student.section_id || '', fullNameBn: student.full_name_bn || '',
      dateOfBirth: student.date_of_birth || '', guardianName: student.guardian_name || '', guardianPhone: student.guardian_phone || '',
      gender: student.gender || '', fatherName: student.father_name || '', fatherPhone: student.father_phone || '',
      motherName: student.mother_name || '', motherPhone: student.mother_phone || '', studentPhone: student.student_phone || '',
      email: student.email || '', nickname: student.nickname || '', bloodGroup: student.blood_group || '', religion: student.religion || '',
      groupName: student.group_name || 'Common', birthCertificateNumber: student.birth_certificate_number || '',
      previousInstituteName: student.previous_institute_name || '', session: student.session || '', presentVillage: student.present_village || '',
      presentDistrict: student.present_district || '', presentThana: student.present_thana || '', presentPostOffice: student.present_post_office || '',
      presentHolding: student.present_holding || '', permanentVillage: student.permanent_village || '', permanentDistrict: student.permanent_district || '',
      permanentThana: student.permanent_thana || '', permanentPostOffice: student.permanent_post_office || '', permanentHolding: student.permanent_holding || '',
      fatherNid: student.father_nid || '', fatherOccupation: student.father_occupation || '', motherNid: student.mother_nid || '',
      motherOccupation: student.mother_occupation || '', fatherNameBn: student.father_name_bn || '', motherNameBn: student.mother_name_bn || '',
      familyYearlyIncome: student.family_yearly_income == null ? '' : String(student.family_yearly_income),
      classRegistrationNumber: student.class_registration_number || '', boardRegistration: student.board_registration || '', boardRoll: student.board_roll || '',
      publicExamName: student.public_exam_name || '', publicExamRoll: student.public_exam_roll || '',
      publicExamRegistrationNumber: student.public_exam_registration_number || '', sscSession: student.ssc_session || '',
      publicExamGpa: student.public_exam_gpa == null ? '' : String(student.public_exam_gpa), publicExamGrade: student.public_exam_grade || '',
      sscPassingYear: student.ssc_passing_year == null ? '' : String(student.ssc_passing_year), sameAsPresentAddress: Boolean(student.same_as_present_address),
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setForm(emptyStudent)
    setPhotoFile(null)
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
      sectionId: form.sectionId,
    }
    try {
      const response = await fetch(`/api/school/students?schoolId=${encodeURIComponent(schoolId)}`, {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(await readError(response))
      const saved = await response.json() as { student?: { id: string } }
      const studentId = editing?.id || saved.student?.id
      if (photoFile && studentId) {
        const upload = new FormData(); upload.append('photo', photoFile)
        const photoResponse = await fetch(`/api/school/students/photo?schoolId=${encodeURIComponent(schoolId)}&studentId=${encodeURIComponent(studentId)}`, { method: 'POST', body: upload })
        if (!photoResponse.ok) throw new Error(await readError(photoResponse))
      }
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
        body: JSON.stringify(studentBody(student, nextStatus)),
      })
      if (!response.ok) throw new Error(await readError(response))
      await loadData()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Student status could not be updated.')
    }
  }

  async function bulkStatus(nextStatus: 'active' | 'inactive') {
    if (!selectedIds.length) return
    setError('')
    try {
      const response = await fetch(`/api/school/students?schoolId=${encodeURIComponent(schoolId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status: nextStatus }),
      })
      if (!response.ok) throw new Error(await readError(response))
      await loadData()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Student status could not be updated.') }
  }

  function exportStudents() {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = [['Student ID', 'Roll', 'Name', 'Name (Bangla)', 'Class', 'House / Section', 'Group', 'Guardian', 'Guardian phone', 'Student phone', 'Status'],
      ...students.map((student) => [student.student_code, student.roll_number, student.full_name, student.full_name_bn, student.class_name, student.section_name, student.group_name, student.guardian_name, student.guardian_phone, student.student_phone, student.status])]
    const csv = rows.map((row) => row.map(quote).join(',')).join('\r\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = 'digiverse-students.csv'; link.click(); URL.revokeObjectURL(link.href)
  }

  return <section className="settings-page data-page">
    <div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> STUDENT INFORMATION</div><h1>Students</h1><p>Enrollment, family contacts, and class placement · up to 500 active students.</p></div><div className="student-heading-actions"><button className="quiet-button export-button" onClick={exportStudents} disabled={!students.length}><Download size={14} /> Export CSV</button><button className="primary-button compact-action" onClick={() => { setForm(emptyStudent); setEditing(null); setFormOpen(!formOpen); setError('') }}><Plus size={15} /> Add student</button></div></div>
    <div className="settings-card data-card">
      <div className="data-card-header student-directory-header"><div><h2>Student directory</h2><p>{students.length} records match your filters</p></div><div className="student-filters"><label className="student-search"><Search size={15} /><input aria-label="Search students" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, roll, guardian…" /></label><select aria-label="Filter by class" value={classFilter} onChange={(event) => { setClassFilter(event.target.value); setSectionFilter('') }}><option value="">All classes</option>{classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><select aria-label="Filter by house or section" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}><option value="">All houses / sections</option>{sections.filter((section) => !classFilter || section.class_id === classFilter).map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select><select aria-label="Filter by group" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="">All groups</option><option>Common</option><option>Science</option><option>Humanities</option><option>Business Studies</option></select><select aria-label="Filter by student status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="transferred">Transferred</option><option value="all">All statuses</option></select></div></div>
      {selectedIds.length > 0 && <div className="student-bulk-bar"><strong>{selectedIds.length} selected</strong><span /><button onClick={() => void bulkStatus('active')}>Set active</button><button onClick={() => void bulkStatus('inactive')}>Set inactive</button><button className="quiet-button" onClick={() => setSelectedIds([])}>Clear selection</button></div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      {formOpen && <form className="student-form student-editor" onSubmit={submit}><div className="student-form-heading"><div><strong>{editing ? `Edit ${editing.full_name}` : 'Enroll a student'}</strong><small>Complete each section below. Required fields are marked with an asterisk.</small></div><button type="button" aria-label="Close form" className="icon-button" onClick={closeForm}><X size={16} /></button></div><nav className="student-section-nav" aria-label="Student form sections"><a href="#student-section-personal">01 · Student</a><a href="#student-section-family">02 · Family</a><a href="#student-section-admission">03 · Admission</a><a href="#student-section-exam">04 · Public exam</a><a href="#student-section-present">05 · Present address</a><a href="#student-section-permanent">06 · Permanent address</a></nav>
        <label className="student-photo-upload">Student photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} /><small>JPG, PNG or WebP · max 5 MB · stored privately</small>{photoFile ? <img src={URL.createObjectURL(photoFile)} alt="Selected student" /> : editing?.photo_object_key ? <img src={`/api/school/students/photo?schoolId=${encodeURIComponent(schoolId)}&studentId=${encodeURIComponent(editing.id)}`} alt="Current student profile" /> : null}</label>
        <h3 id="student-section-personal">01 <span>Student information</span></h3><div className="student-subsection-title">Class placement and identifiers</div><div className="student-form-grid">
        <label>Student name *<input required maxLength={120} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Student ID *<input required maxLength={40} value={form.studentCode} onChange={(e) => setForm({ ...form, studentCode: e.target.value })} /></label>
        <label>Roll number *<input required maxLength={30} value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} /></label>
        <label>Class *<select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, sectionId: '' })}><option value="">Choose a class</option>{classes.filter((entry) => entry.status !== 'inactive' || entry.id === editing?.class_id).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.status === 'inactive' ? ' (inactive)' : ''}</option>)}</select></label>
        <label>House / section<select value={form.sectionId} disabled={!form.classId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })}><option value="">No house assigned</option>{sections.filter((section) => section.class_id === form.classId && (section.status === 'active' || section.id === editing?.section_id)).map((section) => <option key={section.id} value={section.id}>{section.name}{section.nickname ? ` · ${section.nickname}` : ''}</option>)}</select></label>
        <label>Group<select value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })}><option>Common</option><option>Science</option><option>Humanities</option><option>Business Studies</option></select></label>
        <label>Name in Bangla<input maxLength={120} value={form.fullNameBn} onChange={(e) => setForm({ ...form, fullNameBn: e.target.value })} /></label>
        <label>Nickname <span className="optional-label">Optional</span><input maxLength={60} value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} /></label>
        <label>Date of birth<input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></label>
        <label>Gender *<select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Not set</option><option>Male</option><option>Female</option><option>Other</option></select></label>
        <label>Blood group<select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}><option value="">Not set</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}</select></label>
        <label>Religion<select value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })}><option value="">Not set</option>{['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Others'].map((religion) => <option key={religion}>{religion}</option>)}</select></label>
      </div>
      <h3 id="student-section-family">02 <span>Family and contact</span></h3><div className="student-form-grid"><label>Father’s name *<input required maxLength={120} value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></label><label>Father’s name (Bangla)<input maxLength={120} value={form.fatherNameBn} onChange={(e) => setForm({ ...form, fatherNameBn: e.target.value })} /></label><label>Father’s NID<input maxLength={40} value={form.fatherNid} onChange={(e) => setForm({ ...form, fatherNid: e.target.value })} /></label><label>Father’s occupation<input maxLength={100} value={form.fatherOccupation} onChange={(e) => setForm({ ...form, fatherOccupation: e.target.value })} /></label><label>Father’s phone<input type="tel" maxLength={32} value={form.fatherPhone} onChange={(e) => setForm({ ...form, fatherPhone: e.target.value })} /></label><label>Mother’s name *<input required maxLength={120} value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} /></label><label>Mother’s name (Bangla)<input maxLength={120} value={form.motherNameBn} onChange={(e) => setForm({ ...form, motherNameBn: e.target.value })} /></label><label>Mother’s NID<input maxLength={40} value={form.motherNid} onChange={(e) => setForm({ ...form, motherNid: e.target.value })} /></label><label>Mother’s occupation<input maxLength={100} value={form.motherOccupation} onChange={(e) => setForm({ ...form, motherOccupation: e.target.value })} /></label><label>Mother’s phone<input type="tel" maxLength={32} value={form.motherPhone} onChange={(e) => setForm({ ...form, motherPhone: e.target.value })} /></label><label>Guardian name *<input required maxLength={120} value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></label><label>Guardian phone *<input required type="tel" maxLength={32} value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} /></label><label>Student phone<input type="tel" maxLength={32} value={form.studentPhone} onChange={(e) => setForm({ ...form, studentPhone: e.target.value })} /></label><label>Student email<input type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Annual family income<input type="number" min="0" step="1" value={form.familyYearlyIncome} onChange={(e) => setForm({ ...form, familyYearlyIncome: e.target.value })} /></label></div>
      <div className="student-extra-fields"><h3 id="student-section-admission">03 <span>Admission and board registration</span></h3><div className="student-form-grid"><label>Birth certificate number<input maxLength={50} value={form.birthCertificateNumber} onChange={(e) => setForm({ ...form, birthCertificateNumber: e.target.value })} /></label><label>Previous institute<input maxLength={120} value={form.previousInstituteName} onChange={(e) => setForm({ ...form, previousInstituteName: e.target.value })} /></label><label>Session<input maxLength={20} value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} placeholder="e.g. 2026–2027" /></label><div className="student-subsection-title">Registration details</div><label>Class registration number<input maxLength={60} value={form.classRegistrationNumber} onChange={(e) => setForm({ ...form, classRegistrationNumber: e.target.value })} /></label><label>Board registration<input maxLength={60} value={form.boardRegistration} onChange={(e) => setForm({ ...form, boardRegistration: e.target.value })} /></label><label>Board roll<input maxLength={60} value={form.boardRoll} onChange={(e) => setForm({ ...form, boardRoll: e.target.value })} /></label><div className="student-subsection-title" id="student-section-exam">Public examination information</div><label>Public exam name<input maxLength={80} value={form.publicExamName} onChange={(e) => setForm({ ...form, publicExamName: e.target.value })} /></label><label>Public exam roll<input maxLength={60} value={form.publicExamRoll} onChange={(e) => setForm({ ...form, publicExamRoll: e.target.value })} /></label><label>Public exam registration<input maxLength={60} value={form.publicExamRegistrationNumber} onChange={(e) => setForm({ ...form, publicExamRegistrationNumber: e.target.value })} /></label><label>SSC session<input maxLength={30} value={form.sscSession} onChange={(e) => setForm({ ...form, sscSession: e.target.value })} /></label><label>GPA<input type="number" min="0" max="5" step="0.01" value={form.publicExamGpa} onChange={(e) => setForm({ ...form, publicExamGpa: e.target.value })} /></label><label>Grade<select value={form.publicExamGrade} onChange={(e) => setForm({ ...form, publicExamGrade: e.target.value })}><option value="">Not set</option>{['A+', 'A', 'A-', 'B', 'C', 'D', 'F'].map((grade) => <option key={grade}>{grade}</option>)}</select></label><label>SSC passing year<input type="number" min="1900" max="2100" value={form.sscPassingYear} onChange={(e) => setForm({ ...form, sscPassingYear: e.target.value })} /></label><div className="student-subsection-title" id="student-section-present">Present address</div><label>Present village<input maxLength={120} value={form.presentVillage} onChange={(e) => setForm({ ...form, presentVillage: e.target.value })} /></label><label>Present district<input maxLength={80} value={form.presentDistrict} onChange={(e) => setForm({ ...form, presentDistrict: e.target.value })} /></label><label>Present thana<input maxLength={80} value={form.presentThana} onChange={(e) => setForm({ ...form, presentThana: e.target.value })} /></label><label>Present post office<input maxLength={100} value={form.presentPostOffice} onChange={(e) => setForm({ ...form, presentPostOffice: e.target.value })} /></label><label>Present holding number<input maxLength={60} value={form.presentHolding} onChange={(e) => setForm({ ...form, presentHolding: e.target.value })} /></label><div className="student-subsection-title" id="student-section-permanent">Permanent address</div><label className="student-same-address"><input type="checkbox" checked={form.sameAsPresentAddress} onChange={(e) => setForm({ ...form, sameAsPresentAddress: e.target.checked, ...(e.target.checked ? { permanentVillage: form.presentVillage, permanentDistrict: form.presentDistrict, permanentThana: form.presentThana, permanentPostOffice: form.presentPostOffice, permanentHolding: form.presentHolding } : {}) })} />Permanent address same as present</label><label>Permanent village<input maxLength={120} value={form.permanentVillage} onChange={(e) => setForm({ ...form, permanentVillage: e.target.value })} /></label><label>Permanent district<input maxLength={80} value={form.permanentDistrict} onChange={(e) => setForm({ ...form, permanentDistrict: e.target.value })} /></label><label>Permanent thana<input maxLength={80} value={form.permanentThana} onChange={(e) => setForm({ ...form, permanentThana: e.target.value })} /></label><label>Permanent post office<input maxLength={100} value={form.permanentPostOffice} onChange={(e) => setForm({ ...form, permanentPostOffice: e.target.value })} /></label><label>Permanent holding number<input maxLength={60} value={form.permanentHolding} onChange={(e) => setForm({ ...form, permanentHolding: e.target.value })} /></label></div></div>
      <div className="student-form-actions"><button className="primary-button" disabled={saving || classes.length === 0}>{saving ? 'Saving…' : editing ? 'Save student record' : 'Enroll student'}</button><button type="button" className="quiet-button" onClick={closeForm}>Cancel</button>{classes.length === 0 && <button type="button" className="text-action" onClick={() => onNavigate('classes')}>Create a class first</button>}</div></form>}
      {loading ? <div className="data-empty">Loading student records…</div> : students.length === 0 ? <div className="data-empty"><span className="empty-icon"><Users size={20} /></span><strong>No students found</strong><p>{search || classFilter || sectionFilter || groupFilter ? 'Adjust your filters or search for another student.' : classes.length ? 'Add a student to begin your directory.' : 'Create at least one class before enrolling students.'}</p>{!classes.length && <button className="text-action" onClick={() => onNavigate('classes')}>Go to classes</button>}</div> : <div className="table-scroll"><table className="data-table student-table"><thead><tr><th><input aria-label="Select all students" type="checkbox" checked={students.length > 0 && students.every((student) => selectedIds.includes(student.id))} onChange={(event) => setSelectedIds(event.target.checked ? students.map((student) => student.id) : [])} /></th><th>Student ID</th><th>Roll</th><th>Student</th><th>Class / house</th><th>Group</th><th>Mobile</th><th>Status</th><th>Actions</th></tr></thead><tbody>{students.map((student) => <tr key={student.id}><td><input aria-label={`Select ${student.full_name}`} type="checkbox" checked={selectedIds.includes(student.id)} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, student.id] : selectedIds.filter((id) => id !== student.id))} /></td><td><strong>{student.student_code}</strong></td><td>{student.roll_number}</td><td><strong>{student.full_name}</strong>{student.full_name_bn && <small className="cell-subtitle">{student.full_name_bn}</small>}{student.nickname && <small className="cell-subtitle">Badge: {student.nickname}</small>}</td><td>{student.class_name}<small className="cell-subtitle">{student.section_name || 'No house assigned'}</small></td><td>{student.group_name || 'Common'}</td><td>{student.student_phone || student.guardian_phone || '—'}<small className="cell-subtitle">{student.guardian_name || ''}</small></td><td><span className={`student-status status-${student.status}`}>{student.status}</span></td><td className="row-actions"><button aria-label={`View ${student.full_name}`} onClick={() => setViewing(student)}><Eye size={14} /></button><button onClick={() => editStudent(student)}>Edit</button><button className={student.status === 'active' ? 'danger-text' : ''} onClick={() => void setStudentStatus(student)}>{student.status === 'active' ? 'Inactive' : 'Activate'}</button></td></tr>)}</tbody></table></div>}
      {viewing && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewing(null) }}><section className="teacher-dialog student-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="student-profile-title"><div className="student-form-heading"><div><div className="student-profile-kicker">STUDENT PROFILE · {viewing.student_code}</div><h2 id="student-profile-title">{viewing.full_name}</h2><p>{viewing.class_name} · Roll {viewing.roll_number}{viewing.section_name ? ` · ${viewing.section_name}` : ''}</p></div><button aria-label="Close profile" className="icon-button" onClick={() => setViewing(null)}><X size={16} /></button></div>{viewing.photo_object_key && <img className="student-profile-photo" src={`/api/school/students/photo?schoolId=${encodeURIComponent(schoolId)}&studentId=${encodeURIComponent(viewing.id)}`} alt={`${viewing.full_name} profile`} />}<div className="student-details-grid"><div><small>Status</small><strong>{viewing.status}</strong></div><div><small>Group</small><strong>{viewing.group_name || 'Common'}</strong></div><div><small>Name in Bangla</small><strong>{viewing.full_name_bn || '—'}</strong></div><div><small>Date of birth</small><strong>{viewing.date_of_birth || '—'}</strong></div><div><small>Gender · blood group</small><strong>{[viewing.gender, viewing.blood_group].filter(Boolean).join(' · ') || '—'}</strong></div><div><small>Religion</small><strong>{viewing.religion || '—'}</strong></div><div><small>Student phone / email</small><strong>{[viewing.student_phone, viewing.email].filter(Boolean).join(' · ') || '—'}</strong></div><div><small>Guardian</small><strong>{viewing.guardian_name || '—'}{viewing.guardian_phone ? ` · ${viewing.guardian_phone}` : ''}</strong></div><div><small>Father (Bangla) · NID · occupation</small><strong>{[viewing.father_name_bn, viewing.father_nid, viewing.father_occupation].filter(Boolean).join(" · ") || "—"}</strong></div><div><small>Father</small><strong>{viewing.father_name || '—'}{viewing.father_phone ? ` · ${viewing.father_phone}` : ''}</strong></div><div><small>Mother (Bangla) · NID · occupation</small><strong>{[viewing.mother_name_bn, viewing.mother_nid, viewing.mother_occupation].filter(Boolean).join(" · ") || "—"}</strong></div><div><small>Mother</small><strong>{viewing.mother_name || '—'}{viewing.mother_phone ? ` · ${viewing.mother_phone}` : ''}</strong></div><div><small>Annual family income</small><strong>{viewing.family_yearly_income ?? "—"}</strong></div><div><small>Birth certificate</small><strong>{viewing.birth_certificate_number || '—'}</strong></div><div><small>Previous institute · session</small><strong>{[viewing.previous_institute_name, viewing.session].filter(Boolean).join(' · ') || '—'}</strong></div><div><small>Class registration</small><strong>{viewing.class_registration_number || "—"}</strong></div><div><small>Board registration · roll</small><strong>{[viewing.board_registration, viewing.board_roll].filter(Boolean).join(" · ") || "—"}</strong></div><div><small>Public examination</small><strong>{[viewing.public_exam_name, viewing.public_exam_roll, viewing.public_exam_registration_number, viewing.ssc_session, viewing.public_exam_gpa, viewing.public_exam_grade, viewing.ssc_passing_year].filter((value) => value !== null && value !== "").join(" · ") || "—"}</strong></div><div><small>Present address</small><strong>{[viewing.present_holding, viewing.present_village, viewing.present_thana, viewing.present_district].filter(Boolean).join(', ') || '—'}</strong></div><div><small>Permanent address</small><strong>{[viewing.permanent_holding, viewing.permanent_village, viewing.permanent_thana, viewing.permanent_district].filter(Boolean).join(', ') || '—'}</strong></div></div><div className="student-form-actions"><button className="primary-button" onClick={() => { const current = viewing; setViewing(null); editStudent(current) }}>Edit student</button><button className="quiet-button" onClick={() => setViewing(null)}>Close</button></div></section></div>}
    </div>
  </section>
}

interface Teacher {
  id: string; employee_code: string; full_name: string; full_name_bn: string | null
  email: string | null; phone: string | null; designation: string | null
  joining_date: string | null; status: 'active' | 'inactive'; father_name: string | null; mother_name: string | null
  gender: string | null; birthday: string | null; department: string | null; nid_number: string | null
  punch_code: string | null; religion: string | null; blood_group: string | null; archived_at: string | null
  present_village: string | null; present_post_office: string | null; present_thana: string | null
  present_district: string | null; present_holding: string | null; permanent_village: string | null
  permanent_post_office: string | null; permanent_thana: string | null; permanent_district: string | null
  permanent_holding: string | null
}

const emptyTeacher = {
  fullName: '', employeeCode: '', fullNameBn: '', fatherName: '', motherName: '', phone: '', email: '', gender: '', birthday: '',
  designation: '', department: '', joiningDate: '', nidNumber: '', punchCode: '', religion: '', bloodGroup: '',
  presentVillage: '', presentPostOffice: '', presentThana: '', presentDistrict: '', presentHolding: '',
  permanentVillage: '', permanentPostOffice: '', permanentThana: '', permanentDistrict: '', permanentHolding: '',
}

function teacherFormFromRecord(teacher: Teacher) {
  return {
    fullName: teacher.full_name, employeeCode: teacher.employee_code, fullNameBn: teacher.full_name_bn || '',
    fatherName: teacher.father_name || '', motherName: teacher.mother_name || '', phone: teacher.phone || '', email: teacher.email || '',
    gender: teacher.gender || '', birthday: teacher.birthday || '', designation: teacher.designation || '', department: teacher.department || '',
    joiningDate: teacher.joining_date || '', nidNumber: teacher.nid_number || '', punchCode: teacher.punch_code || '',
    religion: teacher.religion || '', bloodGroup: teacher.blood_group || '',
    presentVillage: teacher.present_village || '', presentPostOffice: teacher.present_post_office || '', presentThana: teacher.present_thana || '',
    presentDistrict: teacher.present_district || '', presentHolding: teacher.present_holding || '',
    permanentVillage: teacher.permanent_village || '', permanentPostOffice: teacher.permanent_post_office || '', permanentThana: teacher.permanent_thana || '',
    permanentDistrict: teacher.permanent_district || '', permanentHolding: teacher.permanent_holding || '',
  }
}

export function TeachersPage({ schoolId }: Props) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [form, setForm] = useState(emptyTeacher)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [viewing, setViewing] = useState<Teacher | null>(null)
  const [resetLink, setResetLink] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [copied, setCopied] = useState(false)
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
    setForm(teacherFormFromRecord(teacher))
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
    if (teacher.archived_at) {
      try {
        const response = await fetch(`/api/school/teachers?schoolId=${encodeURIComponent(schoolId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: teacher.id, restore: true }) })
        if (!response.ok) throw new Error(await readError(response))
        await loadTeachers()
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Teacher could not be restored.') }
      return
    }
    const nextStatus = teacher.status === 'active' ? 'inactive' : 'active'
    if (nextStatus === 'inactive' && !window.confirm(`Mark ${teacher.full_name} inactive?`)) return
    try {
      const response = await fetch(`/api/school/teachers?schoolId=${encodeURIComponent(schoolId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...teacherFormFromRecord(teacher), id: teacher.id, status: nextStatus }),
      })
      if (!response.ok) throw new Error(await readError(response))
      await loadTeachers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Teacher status could not be updated.') }
  }

  async function archiveTeacher(teacher: Teacher) {
    if (!window.confirm(`Move ${teacher.full_name} to the archive? The record can be restored later.`)) return
    try {
      const response = await fetch(`/api/school/teachers?schoolId=${encodeURIComponent(schoolId)}&id=${encodeURIComponent(teacher.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await readError(response))
      await loadTeachers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Teacher could not be archived.') }
  }

  async function requestPasswordReset(teacher: Teacher) {
    if (!window.confirm(`Create a one-time password reset link for ${teacher.full_name}? Anyone with the link can change that login password.`)) return
    setResetLink(''); setResetError(''); setCopied(false); setResetBusy(true)
    try {
      const response = await fetch(`/api/school/teachers/reset-password?schoolId=${encodeURIComponent(schoolId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacherId: teacher.id }) })
      if (!response.ok) throw new Error(await readError(response))
      const data = await response.json() as { resetUrl: string }
      setResetLink(data.resetUrl)
    } catch (cause) { setResetError(cause instanceof Error ? cause.message : 'A reset link could not be created.') }
    finally { setResetBusy(false) }
  }

  return <section className="settings-page data-page">
    <div className="settings-heading data-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> STAFF DIRECTORY</div><h1>Teachers</h1><p>Manage teacher profiles and employment status for your school.</p></div><button className="primary-button compact-action" onClick={() => { setForm(emptyTeacher); setEditing(null); setFormOpen(!formOpen); setError('') }}><Plus size={15} /> Add teacher</button></div>
    <div className="settings-card data-card">
      <div className="data-card-header"><div><h2>Teacher directory</h2><p>{teachers.length} records shown</p></div><div className="data-filters"><label className="student-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, role…" /></label><select aria-label="Filter by teacher status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active teachers</option><option value="inactive">Inactive</option><option value="all">All active and inactive</option><option value="archived">Archived</option></select></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {formOpen && <form className="student-form teacher-form" onSubmit={submit}><div className="student-form-heading"><strong>{editing ? 'Edit teacher profile' : 'Add a teacher'}</strong><button type="button" aria-label="Close form" className="icon-button" onClick={closeForm}><X size={16} /></button></div>
        <h3>Personal information</h3><div className="student-form-grid">
          <label>Full name<input required maxLength={120} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
          <label>Bangla name<input maxLength={120} value={form.fullNameBn} onChange={(e) => setForm({ ...form, fullNameBn: e.target.value })} /></label>
          <label>Employee ID<input required maxLength={40} value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></label>
          <label>Father's name<input maxLength={120} value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></label>
          <label>Mother's name<input maxLength={120} value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} /></label>
          <label>Gender *<select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Other</option></select></label>
          <label>Birthday<input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></label>
          <label>Phone<input type="tel" maxLength={32} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Email<input type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>NID number<input maxLength={40} value={form.nidNumber} onChange={(e) => setForm({ ...form, nidNumber: e.target.value })} /></label>
          <label>Religion<select value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })}><option value="">Select religion</option>{['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Blood group<select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}><option value="">Select blood group</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <h3>Office information</h3><div className="student-form-grid">
          <label>Designation<input maxLength={80} placeholder="e.g. Mathematics teacher" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></label>
          <label>Department<input maxLength={80} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
          <label>Joining date<input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></label>
          <label>Punch code<input maxLength={40} value={form.punchCode} onChange={(e) => setForm({ ...form, punchCode: e.target.value })} /></label>
        </div>
        <h3>Present address</h3><div className="student-form-grid">
          <label>Village<input maxLength={120} value={form.presentVillage} onChange={(e) => setForm({ ...form, presentVillage: e.target.value })} /></label>
          <label>Post office<input maxLength={120} value={form.presentPostOffice} onChange={(e) => setForm({ ...form, presentPostOffice: e.target.value })} /></label>
          <label>Thana / upazila<input maxLength={120} value={form.presentThana} onChange={(e) => setForm({ ...form, presentThana: e.target.value })} /></label>
          <label>District<input maxLength={120} value={form.presentDistrict} onChange={(e) => setForm({ ...form, presentDistrict: e.target.value })} /></label>
          <label>Holding / house<input maxLength={120} value={form.presentHolding} onChange={(e) => setForm({ ...form, presentHolding: e.target.value })} /></label>
        </div>
        <h3>Permanent address</h3><div className="student-form-grid">
          <label>Village<input maxLength={120} value={form.permanentVillage} onChange={(e) => setForm({ ...form, permanentVillage: e.target.value })} /></label>
          <label>Post office<input maxLength={120} value={form.permanentPostOffice} onChange={(e) => setForm({ ...form, permanentPostOffice: e.target.value })} /></label>
          <label>Thana / upazila<input maxLength={120} value={form.permanentThana} onChange={(e) => setForm({ ...form, permanentThana: e.target.value })} /></label>
          <label>District<input maxLength={120} value={form.permanentDistrict} onChange={(e) => setForm({ ...form, permanentDistrict: e.target.value })} /></label>
          <label>Holding / house<input maxLength={120} value={form.permanentHolding} onChange={(e) => setForm({ ...form, permanentHolding: e.target.value })} /></label>
        </div>
        <div className="student-form-actions"><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save teacher' : 'Create teacher'}</button><button type="button" className="quiet-button" onClick={closeForm}>Cancel</button></div>
      </form>}
      {loading ? <div className="data-empty">Loading teacher records…</div> : teachers.length === 0 ? <div className="data-empty"><span className="empty-icon"><Users size={20} /></span><strong>No teachers found</strong><p>{search ? 'Try another search.' : status === 'archived' ? 'Archived teacher records will appear here.' : 'Add your first teacher profile to build the staff directory.'}</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Teacher</th><th>Employee ID</th><th>Contact</th><th>Designation</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead><tbody>{teachers.map((teacher) => <tr key={teacher.id}><td><strong>{teacher.full_name}</strong>{teacher.full_name_bn && <small className="cell-subtitle">{teacher.full_name_bn}</small>}</td><td>{teacher.employee_code}</td><td><span className="teacher-contact">{teacher.email && <span><Mail size={12} />{teacher.email}</span>}{teacher.phone && <span><Phone size={12} />{teacher.phone}</span>}{!teacher.email && !teacher.phone && '—'}</span></td><td>{teacher.designation || '—'}</td><td>{teacher.department || '—'}</td><td><span className={`student-status status-${teacher.archived_at ? 'inactive' : teacher.status}`}>{teacher.archived_at ? 'archived' : teacher.status}</span></td><td className="teacher-actions"><button onClick={() => setViewing(teacher)}>View</button>{teacher.archived_at ? <button onClick={() => void changeStatus(teacher)}>Restore</button> : <><button onClick={() => startEdit(teacher)}>Edit</button><button onClick={() => void requestPasswordReset(teacher)}>Reset password</button><button className="danger-text" onClick={() => void archiveTeacher(teacher)}>Delete</button></>}</td></tr>)}</tbody></table></div>}
    </div>
    {viewing && <div className="dialog-backdrop" role="presentation" onClick={() => setViewing(null)}><section className="teacher-dialog" role="dialog" aria-modal="true" aria-labelledby="teacher-detail-title" onClick={(event) => event.stopPropagation()}><div className="student-form-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> TEACHER PROFILE</div><h2 id="teacher-detail-title">{viewing.full_name}</h2><p>{viewing.designation || 'Teacher'} · ID {viewing.employee_code}</p></div><button className="icon-button" aria-label="Close teacher profile" onClick={() => setViewing(null)}><X size={17} /></button></div><div className="teacher-details-grid">{[
      ['Bangla name', viewing.full_name_bn], ["Father's name", viewing.father_name], ["Mother's name", viewing.mother_name], ['Gender', viewing.gender], ['Birthday', viewing.birthday], ['Phone', viewing.phone], ['Email', viewing.email], ['NID', viewing.nid_number], ['Department', viewing.department], ['Joining date', viewing.joining_date], ['Punch code', viewing.punch_code], ['Religion', viewing.religion], ['Blood group', viewing.blood_group],
    ].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value || '—'}</strong></div>)}</div><div className="teacher-addresses">{[['Present address', [viewing.present_holding, viewing.present_village, viewing.present_post_office, viewing.present_thana, viewing.present_district]], ['Permanent address', [viewing.permanent_holding, viewing.permanent_village, viewing.permanent_post_office, viewing.permanent_thana, viewing.permanent_district]]].map(([label, parts]) => <div key={label as string}><small>{label as string}</small><strong>{(parts as (string | null)[]).filter(Boolean).join(', ') || '—'}</strong></div>)}</div><div className="student-form-actions"><button className="primary-button" onClick={() => { startEdit(viewing); setViewing(null) }}>Edit profile</button><button className="quiet-button" onClick={() => setViewing(null)}>Close</button></div></section></div>}
    {(resetLink || resetError || resetBusy) && <div className="dialog-backdrop" role="presentation" onClick={() => { if (!resetBusy) { setResetLink(''); setResetError('') } }}><section className="teacher-dialog reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title" onClick={(event) => event.stopPropagation()}><div className="student-form-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ACCOUNT SECURITY</div><h2 id="reset-dialog-title">Reset teacher password</h2><p>Share a reset link with the teacher directly. It expires in one hour.</p></div><button className="icon-button" aria-label="Close reset dialog" onClick={() => { setResetLink(''); setResetError('') }}><X size={17} /></button></div>{resetBusy && <div className="data-empty">Creating a one-time reset link…</div>}{resetError && <div className="form-error" role="alert">{resetError}</div>}{resetLink && <><label className="reset-link-field">One-time reset link<input readOnly value={resetLink} onFocus={(event) => event.currentTarget.select()} /></label><div className="form-success">Anyone with this link can change the teacher's password. Share it privately; it expires after one hour.</div><button className="primary-button copy-reset-button" onClick={() => void navigator.clipboard.writeText(resetLink).then(() => setCopied(true))}>{copied ? 'Copied reset link' : 'Copy reset link'}</button></>}</section></div>}
  </section>
}
