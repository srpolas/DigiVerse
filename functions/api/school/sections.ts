import { apiJson, getSchoolAccess } from '../../_lib/school-access'
import type { Env } from '../../_lib/auth'

async function access(request: Request, env: Env) {
  const schoolId = new URL(request.url).searchParams.get('schoolId')?.trim() || ''
  if (!schoolId) return { response: apiJson({ error: 'School ID is required.' }, 400) }
  const result = await getSchoolAccess(request, env, schoolId)
  return { ...result, schoolId }
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const classId = new URL(request.url).searchParams.get('classId')?.trim() || ''
  const values = classId ? [allowed.schoolId, classId] : [allowed.schoolId]
  const { results = [] } = await env.CONTROL_DB.prepare(`
    SELECT sections.id, sections.school_id, sections.class_id, sections.name,
      classes.name AS class_name,
      (SELECT COUNT(*) FROM students WHERE students.section_id = sections.id) AS student_count
    FROM sections INNER JOIN classes ON classes.id = sections.class_id AND classes.school_id = sections.school_id
    WHERE sections.school_id = ? ${classId ? 'AND sections.class_id = ?' : ''}
    ORDER BY classes.sort_order, classes.name, sections.name
  `).bind(...values).all()
  return apiJson({ sections: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return apiJson({ error: 'Enter a section name.' }, 400) }
  const classId = clean(body.classId, 80)
  const name = clean(body.name, 60)
  if (!classId || !name) return apiJson({ error: 'Choose a class and enter a section name.' }, 400)
  const parent = await env.CONTROL_DB.prepare('SELECT id FROM classes WHERE id = ? AND school_id = ?').bind(classId, allowed.schoolId).first()
  if (!parent) return apiJson({ error: 'Choose a class from this school.' }, 400)
  const id = crypto.randomUUID()
  try {
    await env.CONTROL_DB.prepare('INSERT INTO sections (id, school_id, class_id, name) VALUES (?, ?, ?, ?)')
      .bind(id, allowed.schoolId, classId, name).run()
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'That section already exists in this class.' }, 409)
    throw error
  }
  return apiJson({ section: { id, school_id: allowed.schoolId, class_id: classId, name, student_count: 0 } }, 201)
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return apiJson({ error: 'Enter a section name.' }, 400) }
  const id = clean(body.id, 80)
  const name = clean(body.name, 60)
  if (!id || !name) return apiJson({ error: 'Enter a section name.' }, 400)
  try {
    const result = await env.CONTROL_DB.prepare('UPDATE sections SET name = ? WHERE id = ? AND school_id = ?').bind(name, id, allowed.schoolId).run()
    if (!result.meta.changes) return apiJson({ error: 'Section not found.' }, 404)
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'That section already exists in this class.' }, 409)
    throw error
  }
  return apiJson({ ok: true })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const id = new URL(request.url).searchParams.get('id')?.trim() || ''
  if (!id) return apiJson({ error: 'Section ID is required.' }, 400)
  const existing = await env.CONTROL_DB.prepare('SELECT id FROM sections WHERE id = ? AND school_id = ?').bind(id, allowed.schoolId).first()
  if (!existing) return apiJson({ error: 'Section not found.' }, 404)
  const students = await env.CONTROL_DB.prepare('SELECT COUNT(*) AS total FROM students WHERE section_id = ?').bind(id).first<{ total: number }>()
  if ((students?.total || 0) > 0) return apiJson({ error: 'Move students out of this section before deleting it.' }, 409)
  await env.CONTROL_DB.prepare('DELETE FROM sections WHERE id = ? AND school_id = ?').bind(id, allowed.schoolId).run()
  return apiJson({ ok: true })
}
