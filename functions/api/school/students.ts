import { apiJson, getSchoolAccess } from '../../_lib/school-access'
import type { Env } from '../../_lib/auth'

interface StudentRow {
  id: string
  school_id: string
  class_id: string
  section_id: string | null
  student_code: string
  roll_number: string
  full_name: string
  full_name_bn: string | null
  date_of_birth: string | null
  guardian_name: string | null
  guardian_phone: string | null
  gender: string | null
  father_name: string | null
  father_phone: string | null
  mother_name: string | null
  mother_phone: string | null
  student_phone: string | null
  email: string | null
  nickname: string | null
  blood_group: string | null
  religion: string | null
  group_name: string
  birth_certificate_number: string | null
  previous_institute_name: string | null
  session: string | null
  present_village: string | null
  present_district: string | null
  present_thana: string | null
  present_post_office: string | null
  present_holding: string | null
  permanent_village: string | null
  permanent_district: string | null
  permanent_thana: string | null
  permanent_post_office: string | null
  permanent_holding: string | null
  status: 'active' | 'inactive' | 'transferred'
  class_name: string
  section_name: string | null
}

async function access(request: Request, env: Env) {
  const schoolId = new URL(request.url).searchParams.get('schoolId')?.trim() || ''
  if (!schoolId) return { response: apiJson({ error: 'School ID is required.' }, 400) }
  const result = await getSchoolAccess(request, env, schoolId)
  return { ...result, schoolId }
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function profileFields(body: Record<string, unknown>) {
  return {
    gender: clean(body.gender, 24), fatherName: clean(body.fatherName, 120), fatherPhone: clean(body.fatherPhone, 32),
    motherName: clean(body.motherName, 120), motherPhone: clean(body.motherPhone, 32), studentPhone: clean(body.studentPhone, 32),
    email: clean(body.email, 254).toLowerCase(), nickname: clean(body.nickname, 60), bloodGroup: clean(body.bloodGroup, 8),
    religion: clean(body.religion, 40), groupName: clean(body.groupName, 40) || 'Common',
    birthCertificateNumber: clean(body.birthCertificateNumber, 50), previousInstituteName: clean(body.previousInstituteName, 120), session: clean(body.session, 20),
    presentVillage: clean(body.presentVillage, 120), presentDistrict: clean(body.presentDistrict, 80), presentThana: clean(body.presentThana, 80),
    presentPostOffice: clean(body.presentPostOffice, 100), presentHolding: clean(body.presentHolding, 60),
    permanentVillage: clean(body.permanentVillage, 120), permanentDistrict: clean(body.permanentDistrict, 80), permanentThana: clean(body.permanentThana, 80),
    permanentPostOffice: clean(body.permanentPostOffice, 100), permanentHolding: clean(body.permanentHolding, 60),
  }
}

const profileColumns = `gender, father_name, father_phone, mother_name, mother_phone, student_phone, email, nickname,
  blood_group, religion, group_name, birth_certificate_number, previous_institute_name, session,
  present_village, present_district, present_thana, present_post_office, present_holding,
  permanent_village, permanent_district, permanent_thana, permanent_post_office, permanent_holding`

function profileValues(profile: ReturnType<typeof profileFields>) {
  return [profile.gender, profile.fatherName, profile.fatherPhone, profile.motherName, profile.motherPhone,
    profile.studentPhone, profile.email, profile.nickname, profile.bloodGroup, profile.religion, profile.groupName,
    profile.birthCertificateNumber, profile.previousInstituteName, profile.session, profile.presentVillage,
    profile.presentDistrict, profile.presentThana, profile.presentPostOffice, profile.presentHolding,
    profile.permanentVillage, profile.permanentDistrict, profile.permanentThana, profile.permanentPostOffice, profile.permanentHolding]
    .map((value) => value || null)
}

async function verifyClass(env: Env, schoolId: string, classId: string, sectionId: string) {
  const schoolClass = await env.CONTROL_DB.prepare('SELECT id FROM classes WHERE id = ? AND school_id = ?')
    .bind(classId, schoolId).first<{ id: string }>()
  if (!schoolClass) return false
  if (!sectionId) return true
  const section = await env.CONTROL_DB.prepare('SELECT id FROM sections WHERE id = ? AND school_id = ? AND class_id = ?')
    .bind(sectionId, schoolId, classId).first<{ id: string }>()
  return Boolean(section)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const url = new URL(request.url)
  const search = url.searchParams.get('search')?.trim() || ''
  const status = url.searchParams.get('status') || 'all'
  const classId = url.searchParams.get('classId') || ''
  const sectionId = url.searchParams.get('sectionId') || ''
  const groupName = url.searchParams.get('groupName') || ''
  let query = `
    SELECT students.*,
      classes.name AS class_name, sections.name AS section_name
    FROM students
    INNER JOIN classes ON classes.id = students.class_id AND classes.school_id = students.school_id
    LEFT JOIN sections ON sections.id = students.section_id AND sections.school_id = students.school_id
    WHERE students.school_id = ?
  `
  const values: (string | number)[] = [allowed.schoolId]
  if (status !== 'all' && ['active', 'inactive', 'transferred'].includes(status)) {
    query += ' AND students.status = ?'
    values.push(status)
  }
  if (classId) {
    query += ' AND students.class_id = ?'
    values.push(classId)
  }
  if (sectionId) { query += ' AND students.section_id = ?'; values.push(sectionId) }
  if (groupName) { query += ' AND students.group_name = ?'; values.push(groupName) }
  if (search) {
    query += ' AND (students.full_name LIKE ? OR students.student_code LIKE ? OR students.roll_number LIKE ? OR students.guardian_name LIKE ?)'
    values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  query += ' ORDER BY classes.sort_order, classes.name, students.roll_number LIMIT 500'
  const { results = [] } = await env.CONTROL_DB.prepare(query).bind(...values).all<StudentRow>()
  return apiJson({ students: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return apiJson({ error: 'Enter the student details.' }, 400) }
  const fullName = clean(body.fullName, 120)
  const studentCode = clean(body.studentCode, 40)
  const rollNumber = clean(body.rollNumber, 30)
  const classId = clean(body.classId, 80)
  const sectionId = clean(body.sectionId, 80)
  const fullNameBn = clean(body.fullNameBn, 120)
  const dateOfBirth = clean(body.dateOfBirth, 10)
  const guardianName = clean(body.guardianName, 120)
  const guardianPhone = clean(body.guardianPhone, 32)
  if (!fullName || !studentCode || !rollNumber || !classId) return apiJson({ error: 'Name, student ID, roll number, and class are required.' }, 400)
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return apiJson({ error: 'Enter the date of birth in YYYY-MM-DD format.' }, 400)
  if (!await verifyClass(env, allowed.schoolId, classId, sectionId)) return apiJson({ error: 'Choose a class and section from this school.' }, 400)
  const activeCount = await env.CONTROL_DB.prepare("SELECT COUNT(*) AS total FROM students WHERE school_id = ? AND status = 'active'")
    .bind(allowed.schoolId).first<{ total: number }>()
  if ((activeCount?.total || 0) >= 500) return apiJson({ error: 'DigiVerse currently supports up to 500 active students per school.' }, 409)
  const id = crypto.randomUUID()
  const profile = profileFields(body)
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return apiJson({ error: 'Enter a valid student email address.' }, 400)
  try {
    await env.CONTROL_DB.prepare(`
      INSERT INTO students (id, school_id, class_id, section_id, student_code, roll_number, full_name,
        full_name_bn, date_of_birth, guardian_name, guardian_phone, ${profileColumns})
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${Array(24).fill('?').join(', ')})
    `).bind(id, allowed.schoolId, classId, sectionId || null, studentCode, rollNumber, fullName,
      fullNameBn || null, dateOfBirth || null, guardianName || null, guardianPhone || null, ...profileValues(profile)).run()
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'That student ID or roll number is already in use.' }, 409)
    throw error
  }
  return apiJson({ student: { id, school_id: allowed.schoolId, class_id: classId, section_id: sectionId || null, student_code: studentCode, roll_number: rollNumber, full_name: fullName, full_name_bn: fullNameBn || null, date_of_birth: dateOfBirth || null, guardian_name: guardianName || null, guardian_phone: guardianPhone || null, status: 'active' } }, 201)
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return apiJson({ error: 'Enter the student details.' }, 400) }
  if (Array.isArray(body.ids) && ['active', 'inactive'].includes(String(body.status))) {
    const ids = [...new Set(body.ids.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))].slice(0, 500)
    if (!ids.length) return apiJson({ error: 'Select at least one student.' }, 400)
    const placeholders = ids.map(() => '?').join(', ')
    const { results = [] } = await env.CONTROL_DB.prepare(`SELECT id, status FROM students WHERE school_id = ? AND id IN (${placeholders})`).bind(allowed.schoolId, ...ids).all<{ id: string; status: string }>()
    if (!results.length) return apiJson({ error: 'No selected student records were found.' }, 404)
    if (body.status === 'active') {
      const current = await env.CONTROL_DB.prepare("SELECT COUNT(*) AS total FROM students WHERE school_id = ? AND status = 'active'").bind(allowed.schoolId).first<{ total: number }>()
      const reactivating = results.filter((row) => row.status !== 'active').length
      if ((current?.total || 0) + reactivating > 500) return apiJson({ error: 'Activating these students would exceed the 500 active student limit.' }, 409)
    }
    await env.CONTROL_DB.prepare(`UPDATE students SET status = ?, updated_at = datetime('now') WHERE school_id = ? AND id IN (${placeholders})`).bind(body.status, allowed.schoolId, ...results.map((row) => row.id)).run()
    return apiJson({ ok: true, updated: results.length })
  }
  const id = clean(body.id, 80)
  const fullName = clean(body.fullName, 120)
  const studentCode = clean(body.studentCode, 40)
  const rollNumber = clean(body.rollNumber, 30)
  const classId = clean(body.classId, 80)
  const sectionId = clean(body.sectionId, 80)
  const fullNameBn = clean(body.fullNameBn, 120)
  const dateOfBirth = clean(body.dateOfBirth, 10)
  const guardianName = clean(body.guardianName, 120)
  const guardianPhone = clean(body.guardianPhone, 32)
  const status = clean(body.status, 16)
  const profile = profileFields(body)
  if (!id || !fullName || !studentCode || !rollNumber || !classId || !['active', 'inactive', 'transferred'].includes(status)) return apiJson({ error: 'Complete the required student details.' }, 400)
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return apiJson({ error: 'Enter the date of birth in YYYY-MM-DD format.' }, 400)
  if (!await verifyClass(env, allowed.schoolId, classId, sectionId)) return apiJson({ error: 'Choose a class and section from this school.' }, 400)
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return apiJson({ error: 'Enter a valid student email address.' }, 400)
  const prior = await env.CONTROL_DB.prepare('SELECT status FROM students WHERE id = ? AND school_id = ?').bind(id, allowed.schoolId).first<{ status: string }>()
  if (!prior) return apiJson({ error: 'Student not found.' }, 404)
  if (status === 'active' && prior.status !== 'active') {
    const count = await env.CONTROL_DB.prepare("SELECT COUNT(*) AS total FROM students WHERE school_id = ? AND status = 'active'").bind(allowed.schoolId).first<{ total: number }>()
    if ((count?.total || 0) >= 500) return apiJson({ error: 'DigiVerse currently supports up to 500 active students per school.' }, 409)
  }
  try {
    await env.CONTROL_DB.prepare(`
      UPDATE students SET class_id = ?, section_id = ?, student_code = ?, roll_number = ?, full_name = ?,
        full_name_bn = ?, date_of_birth = ?, guardian_name = ?, guardian_phone = ?, status = ?,
        gender = ?, father_name = ?, father_phone = ?, mother_name = ?, mother_phone = ?, student_phone = ?, email = ?, nickname = ?,
        blood_group = ?, religion = ?, group_name = ?, birth_certificate_number = ?, previous_institute_name = ?, session = ?,
        present_village = ?, present_district = ?, present_thana = ?, present_post_office = ?, present_holding = ?,
        permanent_village = ?, permanent_district = ?, permanent_thana = ?, permanent_post_office = ?, permanent_holding = ?, updated_at = datetime('now')
      WHERE id = ? AND school_id = ?
    `).bind(classId, sectionId || null, studentCode, rollNumber, fullName, fullNameBn || null, dateOfBirth || null,
      guardianName || null, guardianPhone || null, status, ...profileValues(profile), id, allowed.schoolId).run()
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'That student ID or roll number is already in use.' }, 409)
    throw error
  }
  return apiJson({ ok: true })
}
