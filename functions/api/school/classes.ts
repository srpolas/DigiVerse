import { apiJson, getSchoolAccess } from '../../_lib/school-access'
import type { Env } from '../../_lib/auth'

interface SchoolClass {
  id: string
  school_id: string
  name: string
  sort_order: number
  student_count: number
  created_at: string
}

async function access(request: Request, env: Env) {
  const schoolId = new URL(request.url).searchParams.get('schoolId')?.trim() || ''
  if (!schoolId) return { response: apiJson({ error: 'School ID is required.' }, 400) }
  const result = await getSchoolAccess(request, env, schoolId)
  return { ...result, schoolId }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const { results = [] } = await env.CONTROL_DB.prepare(`
    SELECT classes.id, classes.school_id, classes.name, classes.sort_order, classes.created_at,
      (SELECT COUNT(*) FROM students WHERE students.class_id = classes.id AND students.status = 'active') AS student_count
    FROM classes WHERE classes.school_id = ? ORDER BY classes.sort_order, classes.name
  `).bind(allowed.schoolId).all<SchoolClass>()
  return apiJson({ classes: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: { name?: unknown; sortOrder?: unknown }
  try { body = await request.json() as typeof body } catch { return apiJson({ error: 'Enter a class name.' }, 400) }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const sortOrder = Number.isInteger(body.sortOrder) ? Number(body.sortOrder) : 0
  if (name.length < 1 || name.length > 60) return apiJson({ error: 'Class name must be 1–60 characters.' }, 400)
  const id = crypto.randomUUID()
  try {
    await env.CONTROL_DB.prepare('INSERT INTO classes (id, school_id, name, sort_order) VALUES (?, ?, ?, ?)')
      .bind(id, allowed.schoolId, name, sortOrder).run()
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'A class with that name already exists.' }, 409)
    throw error
  }
  return apiJson({ class: { id, school_id: allowed.schoolId, name, sort_order: sortOrder, student_count: 0 } }, 201)
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: { id?: unknown; name?: unknown; sortOrder?: unknown }
  try { body = await request.json() as typeof body } catch { return apiJson({ error: 'Enter class details.' }, 400) }
  const id = typeof body.id === 'string' ? body.id : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const sortOrder = Number.isInteger(body.sortOrder) ? Number(body.sortOrder) : 0
  if (!id || name.length < 1 || name.length > 60) return apiJson({ error: 'Class name must be 1–60 characters.' }, 400)
  try {
    const result = await env.CONTROL_DB.prepare('UPDATE classes SET name = ?, sort_order = ? WHERE id = ? AND school_id = ?')
      .bind(name, sortOrder, id, allowed.schoolId).run()
    if (!result.meta.changes) return apiJson({ error: 'Class not found.' }, 404)
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'A class with that name already exists.' }, 409)
    throw error
  }
  return apiJson({ ok: true })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const id = new URL(request.url).searchParams.get('id')?.trim() || ''
  if (!id) return apiJson({ error: 'Class ID is required.' }, 400)
  const existing = await env.CONTROL_DB.prepare('SELECT id FROM classes WHERE id = ? AND school_id = ?').bind(id, allowed.schoolId).first<{ id: string }>()
  if (!existing) return apiJson({ error: 'Class not found.' }, 404)
  const students = await env.CONTROL_DB.prepare('SELECT COUNT(*) AS total FROM students WHERE class_id = ?').bind(id).first<{ total: number }>()
  if ((students?.total || 0) > 0) return apiJson({ error: 'This class has students. Move or transfer them before deleting it.' }, 409)
  await env.CONTROL_DB.prepare('DELETE FROM classes WHERE id = ? AND school_id = ?').bind(id, allowed.schoolId).run()
  return apiJson({ ok: true })
}
