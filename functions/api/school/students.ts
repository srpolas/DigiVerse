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
  let query = `
    SELECT students.id, students.school_id, students.class_id, students.section_id,
      students.student_code, students.roll_number, students.full_name, students.full_name_bn,
      students.date_of_birth, students.guardian_name, students.guardian_phone, students.status,
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
  try {
    await env.CONTROL_DB.prepare(`
      INSERT INTO students (id, school_id, class_id, section_id, student_code, roll_number, full_name,
        full_name_bn, date_of_birth, guardian_name, guardian_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, allowed.schoolId, classId, sectionId || null, studentCode, rollNumber, fullName,
      fullNameBn || null, dateOfBirth || null, guardianName || null, guardianPhone || null).run()
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
  if (!id || !fullName || !studentCode || !rollNumber || !classId || !['active', 'inactive', 'transferred'].includes(status)) return apiJson({ error: 'Complete the required student details.' }, 400)
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return apiJson({ error: 'Enter the date of birth in YYYY-MM-DD format.' }, 400)
  if (!await verifyClass(env, allowed.schoolId, classId, sectionId)) return apiJson({ error: 'Choose a class and section from this school.' }, 400)
  const prior = await env.CONTROL_DB.prepare('SELECT status FROM students WHERE id = ? AND school_id = ?').bind(id, allowed.schoolId).first<{ status: string }>()
  if (!prior) return apiJson({ error: 'Student not found.' }, 404)
  if (status === 'active' && prior.status !== 'active') {
    const count = await env.CONTROL_DB.prepare("SELECT COUNT(*) AS total FROM students WHERE school_id = ? AND status = 'active'").bind(allowed.schoolId).first<{ total: number }>()
    if ((count?.total || 0) >= 500) return apiJson({ error: 'DigiVerse currently supports up to 500 active students per school.' }, 409)
  }
  try {
    await env.CONTROL_DB.prepare(`
      UPDATE students SET class_id = ?, section_id = ?, student_code = ?, roll_number = ?, full_name = ?,
        full_name_bn = ?, date_of_birth = ?, guardian_name = ?, guardian_phone = ?, status = ?, updated_at = datetime('now')
      WHERE id = ? AND school_id = ?
    `).bind(classId, sectionId || null, studentCode, rollNumber, fullName, fullNameBn || null, dateOfBirth || null,
      guardianName || null, guardianPhone || null, status, id, allowed.schoolId).run()
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'That student ID or roll number is already in use.' }, 409)
    throw error
  }
  return apiJson({ ok: true })
}
