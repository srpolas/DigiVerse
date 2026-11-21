import { apiJson, getSchoolAccess } from '../../_lib/school-access'
import type { Env } from '../../_lib/auth'

const fields = [
  ['memberCode', 'member_code', 40], ['fullName', 'full_name', 120], ['fullNameBn', 'full_name_bn', 120],
  ['fatherName', 'father_name', 120], ['motherName', 'mother_name', 120], ['phone', 'phone', 32],
  ['gender', 'gender', 24], ['birthday', 'birthday', 10], ['designation', 'designation', 100],
  ['joiningDate', 'joining_date', 10], ['endDate', 'end_date', 10], ['email', 'email', 254],
  ['nidNumber', 'nid_number', 40], ['religion', 'religion', 40], ['bloodGroup', 'blood_group', 8],
  ['presentVillage', 'present_village', 120], ['presentThana', 'present_thana', 120],
  ['presentDistrict', 'present_district', 120], ['presentHolding', 'present_holding', 120],
  ['permanentVillage', 'permanent_village', 120], ['permanentThana', 'permanent_thana', 120],
  ['permanentDistrict', 'permanent_district', 120], ['permanentHolding', 'permanent_holding', 120],
] as const

function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function validDate(value: string) { return !value || /^\d{4}-\d{2}-\d{2}$/.test(value) }
function memberValues(body: Record<string, unknown>) {
  return Object.fromEntries(fields.map(([key, column, max]) => [column, clean(body[key], max) || null])) as Record<string, string | null>
}

async function access(request: Request, env: Env) {
  const schoolId = new URL(request.url).searchParams.get('schoolId')?.trim() || ''
  if (!schoolId) return { response: apiJson({ error: 'School ID is required.' }, 400) }
  const result = await getSchoolAccess(request, env, schoolId)
  if (!result.response && request.method === 'GET' && result.role !== 'school_admin') {
    return { response: apiJson({ error: 'Only school administrators can access committee personnel records.' }, 403) }
  }
  return { ...result, schoolId }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const url = new URL(request.url)
  const search = url.searchParams.get('search')?.trim() || ''
  const status = url.searchParams.get('status') || 'all'
  let query = 'SELECT * FROM committee_members WHERE school_id = ?'
  const values: string[] = [allowed.schoolId]
  if (status === 'archived') query += ' AND archived_at IS NOT NULL'
  else {
    query += ' AND archived_at IS NULL'
    if (status === 'active' || status === 'inactive') { query += ' AND status = ?'; values.push(status) }
  }
  if (search) {
    query += ' AND (member_code LIKE ? OR full_name LIKE ? OR full_name_bn LIKE ? OR designation LIKE ? OR phone LIKE ?)'
    values.push(...Array(5).fill(`%${search}%`))
  }
  query += ' ORDER BY serial_number, full_name LIMIT 500'
  const { results = [] } = await env.CONTROL_DB.prepare(query).bind(...values).all()
  return apiJson({ members: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return apiJson({ error: 'Enter committee member details.' }, 400) }
  const values = memberValues(body)
  const serialNumber = Number.isInteger(body.serialNumber) && Number(body.serialNumber) > 0 ? Number(body.serialNumber) : 0
  const data = { id: crypto.randomUUID(), school_id: allowed.schoolId, ...values, serial_number: serialNumber }
  if (!data.member_code || !data.full_name || !data.phone || !data.designation) return apiJson({ error: 'Member ID, name, mobile number, and designation are required.' }, 400)
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return apiJson({ error: 'Enter a valid email address.' }, 400)
  if (!validDate(data.birthday || '') || !validDate(data.joining_date || '') || !validDate(data.end_date || '')) return apiJson({ error: 'Enter dates in YYYY-MM-DD format.' }, 400)
  try {
    const columns = Object.keys(data)
    await env.CONTROL_DB.prepare(`INSERT INTO committee_members (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`).bind(...Object.values(data)).run()
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'That member ID or email is already in use.' }, 409)
    throw error
  }
  return apiJson({ member: data }, 201)
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return apiJson({ error: 'Enter committee member details.' }, 400) }
  const id = clean(body.id, 80)
  if (body.restore === true) {
    const restored = await env.CONTROL_DB.prepare("UPDATE committee_members SET archived_at = NULL, updated_at = datetime('now') WHERE id = ? AND school_id = ? AND archived_at IS NOT NULL").bind(id, allowed.schoolId).run()
    return restored.meta.changes ? apiJson({ ok: true }) : apiJson({ error: 'Archived committee record not found.' }, 404)
  }
  const values = memberValues(body)
  const serialNumber = Number.isInteger(body.serialNumber) && Number(body.serialNumber) > 0 ? Number(body.serialNumber) : 0
  const status = body.status === 'inactive' ? 'inactive' : 'active'
  if (!id || !values.member_code || !values.full_name || !values.phone || !values.designation) return apiJson({ error: 'Complete the required member details.' }, 400)
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return apiJson({ error: 'Enter a valid email address.' }, 400)
  if (!validDate(values.birthday || '') || !validDate(values.joining_date || '') || !validDate(values.end_date || '')) return apiJson({ error: 'Enter dates in YYYY-MM-DD format.' }, 400)
  const updates = [...fields.map(([, column]) => `${column} = ?`), 'serial_number = ?', 'status = ?', "updated_at = datetime('now')"]
  const parameters = [...fields.map(([, column]) => values[column]), serialNumber, status, id, allowed.schoolId]
  try {
    const result = await env.CONTROL_DB.prepare(`UPDATE committee_members SET ${updates.join(', ')} WHERE id = ? AND school_id = ? AND archived_at IS NULL`).bind(...parameters).run()
    if (!result.meta.changes) return apiJson({ error: 'Committee member not found.' }, 404)
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'That member ID or email is already in use.' }, 409)
    throw error
  }
  return apiJson({ ok: true })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const id = new URL(request.url).searchParams.get('id')?.trim() || ''
  if (!id) return apiJson({ error: 'Committee member ID is required.' }, 400)
  const result = await env.CONTROL_DB.prepare("UPDATE committee_members SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND school_id = ? AND archived_at IS NULL").bind(id, allowed.schoolId).run()
  return result.meta.changes ? apiJson({ ok: true, archived: true }) : apiJson({ error: 'Committee member not found.' }, 404)
}
