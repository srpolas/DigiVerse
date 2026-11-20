import { apiJson, getSchoolAccess } from '../../_lib/school-access'
import type { Env } from '../../_lib/auth'

interface TeacherRow {
  id: string; school_id: string; employee_code: string; full_name: string; full_name_bn: string | null
  email: string | null; phone: string | null; designation: string | null; joining_date: string | null
  father_name: string | null; mother_name: string | null; gender: string | null; birthday: string | null
  department: string | null; nid_number: string | null; punch_code: string | null; religion: string | null
  blood_group: string | null; present_village: string | null; present_post_office: string | null
  present_thana: string | null; present_district: string | null; present_holding: string | null
  permanent_village: string | null; permanent_post_office: string | null; permanent_thana: string | null
  permanent_district: string | null; permanent_holding: string | null; photo_object_key: string | null
  archived_at: string | null; status: 'active' | 'inactive'; created_at: string; updated_at: string
}

async function access(request: Request, env: Env) {
  const schoolId = new URL(request.url).searchParams.get('schoolId')?.trim() || ''
  if (!schoolId) return { response: apiJson({ error: 'School ID is required.' }, 400) }
  return { ...(await getSchoolAccess(request, env, schoolId)), schoolId }
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function validDate(value: string) { return !value || /^\d{4}-\d{2}-\d{2}$/.test(value) }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  if (allowed.role !== 'school_admin') return apiJson({ error: 'Only school administrators can access teacher personnel records.' }, 403)
  const url = new URL(request.url)
  const search = url.searchParams.get('search')?.trim() || ''
  const status = url.searchParams.get('status') || 'all'
  let query = 'SELECT * FROM teachers WHERE school_id = ?'
  const values: string[] = [allowed.schoolId]
  if (status === 'archived') query += ' AND archived_at IS NOT NULL'
  else {
    query += ' AND archived_at IS NULL'
    if (status === 'active' || status === 'inactive') { query += ' AND status = ?'; values.push(status) }
  }
  if (search) {
    query += ' AND (full_name LIKE ? OR employee_code LIKE ? OR email LIKE ? OR phone LIKE ? OR designation LIKE ?)'
    values.push(...Array(5).fill(`%${search}%`))
  }
  query += ' ORDER BY CASE status WHEN \'active\' THEN 0 ELSE 1 END, full_name LIMIT 500'
  const { results = [] } = await env.CONTROL_DB.prepare(query).bind(...values).all<TeacherRow>()
  return apiJson({ teachers: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return apiJson({ error: 'Enter teacher details.' }, 400) }
  const employeeCode = clean(body.employeeCode, 40)
  const fullName = clean(body.fullName, 120)
  const fullNameBn = clean(body.fullNameBn, 120)
  const email = clean(body.email, 254).toLowerCase()
  const phone = clean(body.phone, 32)
  const designation = clean(body.designation, 80)
  const joiningDate = clean(body.joiningDate, 10)
  const birthday = clean(body.birthday, 10)
  const status = body.status === 'inactive' ? 'inactive' : 'active'
  if (!employeeCode || !fullName) return apiJson({ error: 'Employee ID and full name are required.' }, 400)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiJson({ error: 'Enter a valid email address.' }, 400)
  if (!validDate(joiningDate) || !validDate(birthday)) return apiJson({ error: 'Enter dates in YYYY-MM-DD format.' }, 400)
  const id = crypto.randomUUID()
  try {
    await env.CONTROL_DB.prepare(`INSERT INTO teachers (id, school_id, employee_code, full_name, full_name_bn, email, phone, designation, joining_date, status,
      father_name, mother_name, gender, birthday, department, nid_number, punch_code, religion, blood_group,
      present_village, present_post_office, present_thana, present_district, present_holding,
      permanent_village, permanent_post_office, permanent_thana, permanent_district, permanent_holding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, allowed.schoolId, employeeCode, fullName, fullNameBn || null, email || null, phone || null, designation || null, joiningDate || null, status,
        clean(body.fatherName, 120) || null, clean(body.motherName, 120) || null, clean(body.gender, 24) || null,
        birthday || null, clean(body.department, 80) || null, clean(body.nidNumber, 40) || null,
        clean(body.punchCode, 40) || null, clean(body.religion, 40) || null, clean(body.bloodGroup, 8) || null,
        clean(body.presentVillage, 120) || null, clean(body.presentPostOffice, 120) || null,
        clean(body.presentThana, 120) || null, clean(body.presentDistrict, 120) || null, clean(body.presentHolding, 120) || null,
        clean(body.permanentVillage, 120) || null, clean(body.permanentPostOffice, 120) || null,
        clean(body.permanentThana, 120) || null, clean(body.permanentDistrict, 120) || null,
        clean(body.permanentHolding, 120) || null).run()
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'That employee ID or email is already in use.' }, 409)
    throw error
  }
  return apiJson({ teacher: { id, school_id: allowed.schoolId, employee_code: employeeCode, full_name: fullName, full_name_bn: fullNameBn || null, email: email || null, phone: phone || null, designation: designation || null, joining_date: joiningDate || null, status } }, 201)
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return apiJson({ error: 'Enter teacher details.' }, 400) }
  const id = clean(body.id, 80)
  if (body.restore === true) {
    const restored = await env.CONTROL_DB.prepare("UPDATE teachers SET archived_at = NULL, updated_at = datetime('now') WHERE id = ? AND school_id = ? AND archived_at IS NOT NULL")
      .bind(id, allowed.schoolId).run()
    if (!id || !restored.meta.changes) return apiJson({ error: 'Archived teacher not found.' }, 404)
    return apiJson({ ok: true })
  }
  const employeeCode = clean(body.employeeCode, 40)
  const fullName = clean(body.fullName, 120)
  const fullNameBn = clean(body.fullNameBn, 120)
  const email = clean(body.email, 254).toLowerCase()
  const phone = clean(body.phone, 32)
  const designation = clean(body.designation, 80)
  const joiningDate = clean(body.joiningDate, 10)
  const birthday = clean(body.birthday, 10)
  const status = clean(body.status, 16)
  if (!id || !employeeCode || !fullName || !['active', 'inactive'].includes(status)) return apiJson({ error: 'Complete the required teacher details.' }, 400)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiJson({ error: 'Enter a valid email address.' }, 400)
  if (!validDate(joiningDate) || !validDate(birthday)) return apiJson({ error: 'Enter dates in YYYY-MM-DD format.' }, 400)
  try {
    const result = await env.CONTROL_DB.prepare(`UPDATE teachers SET employee_code = ?, full_name = ?, full_name_bn = ?, email = ?, phone = ?, designation = ?, joining_date = ?, status = ?,
      father_name = ?, mother_name = ?, gender = ?, birthday = ?, department = ?, nid_number = ?, punch_code = ?, religion = ?, blood_group = ?,
      present_village = ?, present_post_office = ?, present_thana = ?, present_district = ?, present_holding = ?,
      permanent_village = ?, permanent_post_office = ?, permanent_thana = ?, permanent_district = ?, permanent_holding = ?, updated_at = datetime('now')
      WHERE id = ? AND school_id = ?`)
      .bind(employeeCode, fullName, fullNameBn || null, email || null, phone || null, designation || null, joiningDate || null, status,
        clean(body.fatherName, 120) || null, clean(body.motherName, 120) || null, clean(body.gender, 24) || null,
        birthday || null, clean(body.department, 80) || null, clean(body.nidNumber, 40) || null,
        clean(body.punchCode, 40) || null, clean(body.religion, 40) || null, clean(body.bloodGroup, 8) || null,
        clean(body.presentVillage, 120) || null, clean(body.presentPostOffice, 120) || null,
        clean(body.presentThana, 120) || null, clean(body.presentDistrict, 120) || null, clean(body.presentHolding, 120) || null,
        clean(body.permanentVillage, 120) || null, clean(body.permanentPostOffice, 120) || null,
        clean(body.permanentThana, 120) || null, clean(body.permanentDistrict, 120) || null,
        clean(body.permanentHolding, 120) || null, id, allowed.schoolId).run()
    if (!result.meta.changes) return apiJson({ error: 'Teacher not found.' }, 404)
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'That employee ID or email is already in use.' }, 409)
    throw error
  }
  return apiJson({ ok: true })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const id = new URL(request.url).searchParams.get('id')?.trim() || ''
  if (!id) return apiJson({ error: 'Teacher ID is required.' }, 400)
  const result = await env.CONTROL_DB.prepare("UPDATE teachers SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND school_id = ? AND archived_at IS NULL")
    .bind(id, allowed.schoolId).run()
  if (!result.meta.changes) return apiJson({ error: 'Teacher not found.' }, 404)
  return apiJson({ ok: true, archived: true })
}
