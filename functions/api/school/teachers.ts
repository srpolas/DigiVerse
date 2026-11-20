import { apiJson, getSchoolAccess } from '../../_lib/school-access'
import type { Env } from '../../_lib/auth'

interface TeacherRow {
  id: string; school_id: string; employee_code: string; full_name: string; full_name_bn: string | null
  email: string | null; phone: string | null; designation: string | null; joining_date: string | null
  status: 'active' | 'inactive'; created_at: string; updated_at: string
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
  const url = new URL(request.url)
  const search = url.searchParams.get('search')?.trim() || ''
  const status = url.searchParams.get('status') || 'all'
  let query = 'SELECT * FROM teachers WHERE school_id = ?'
  const values: string[] = [allowed.schoolId]
  if (status === 'active' || status === 'inactive') { query += ' AND status = ?'; values.push(status) }
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
  const status = body.status === 'inactive' ? 'inactive' : 'active'
  if (!employeeCode || !fullName) return apiJson({ error: 'Employee ID and full name are required.' }, 400)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiJson({ error: 'Enter a valid email address.' }, 400)
  if (!validDate(joiningDate)) return apiJson({ error: 'Enter the joining date in YYYY-MM-DD format.' }, 400)
  const id = crypto.randomUUID()
  try {
    await env.CONTROL_DB.prepare(`INSERT INTO teachers (id, school_id, employee_code, full_name, full_name_bn, email, phone, designation, joining_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, allowed.schoolId, employeeCode, fullName, fullNameBn || null, email || null, phone || null, designation || null, joiningDate || null, status).run()
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
  const employeeCode = clean(body.employeeCode, 40)
  const fullName = clean(body.fullName, 120)
  const fullNameBn = clean(body.fullNameBn, 120)
  const email = clean(body.email, 254).toLowerCase()
  const phone = clean(body.phone, 32)
  const designation = clean(body.designation, 80)
  const joiningDate = clean(body.joiningDate, 10)
  const status = clean(body.status, 16)
  if (!id || !employeeCode || !fullName || !['active', 'inactive'].includes(status)) return apiJson({ error: 'Complete the required teacher details.' }, 400)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiJson({ error: 'Enter a valid email address.' }, 400)
  if (!validDate(joiningDate)) return apiJson({ error: 'Enter the joining date in YYYY-MM-DD format.' }, 400)
  try {
    const result = await env.CONTROL_DB.prepare(`UPDATE teachers SET employee_code = ?, full_name = ?, full_name_bn = ?, email = ?, phone = ?, designation = ?, joining_date = ?, status = ?, updated_at = datetime('now')
      WHERE id = ? AND school_id = ?`)
      .bind(employeeCode, fullName, fullNameBn || null, email || null, phone || null, designation || null, joiningDate || null, status, id, allowed.schoolId).run()
    if (!result.meta.changes) return apiJson({ error: 'Teacher not found.' }, 404)
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'That employee ID or email is already in use.' }, 409)
    throw error
  }
  return apiJson({ ok: true })
}
