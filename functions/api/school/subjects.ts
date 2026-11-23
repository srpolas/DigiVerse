import { apiJson, getSchoolAccess } from '../../_lib/school-access'
import type { Env } from '../../_lib/auth'

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function access(request: Request, env: Env) {
  const schoolId = new URL(request.url).searchParams.get('schoolId')?.trim() || ''
  if (!schoolId) return { response: apiJson({ error: 'School ID is required.' }, 400) }
  return { ...(await getSchoolAccess(request, env, schoolId)), schoolId }
}

function arrayOfStrings(value: unknown, max = 24) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))].slice(0, max)
}

async function parseBody(request: Request) {
  try { return await request.json() as Record<string, unknown> } catch { return null }
}

async function validTeacher(env: Env, schoolId: string, teacherId: string) {
  if (!teacherId) return true
  return Boolean(await env.CONTROL_DB.prepare("SELECT id FROM teachers WHERE id = ? AND school_id = ? AND status = 'active'").bind(teacherId, schoolId).first())
}

async function validClasses(env: Env, schoolId: string, classIds: string[]) {
  if (!classIds.length) return false
  const placeholders = classIds.map(() => '?').join(', ')
  const { results = [] } = await env.CONTROL_DB.prepare(`SELECT id FROM classes WHERE school_id = ? AND id IN (${placeholders})`)
    .bind(schoolId, ...classIds).all<{ id: string }>()
  return results.length === classIds.length
}

function validatedMarkingTypes(value: unknown) {
  if (!Array.isArray(value)) return null
  return [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, 50)).filter(Boolean))].slice(0, 12)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const [subjects, classes, teachers] = await Promise.all([
    env.CONTROL_DB.prepare(`SELECT subjects.*, teachers.full_name AS teacher_name,
      COALESCE((SELECT json_group_array(json_object('id', subject_classes.class_id, 'name', classes.name))
        FROM subject_classes INNER JOIN classes ON classes.id = subject_classes.class_id AND classes.school_id = subject_classes.school_id
        WHERE subject_classes.subject_id = subjects.id AND subject_classes.school_id = subjects.school_id), '[]') AS assigned_classes
      FROM subjects LEFT JOIN teachers ON teachers.id = subjects.teacher_id AND teachers.school_id = subjects.school_id
      WHERE subjects.school_id = ? ORDER BY subjects.name`).bind(allowed.schoolId).all(),
    env.CONTROL_DB.prepare('SELECT id, name, sort_order, status FROM classes WHERE school_id = ? ORDER BY sort_order, name').bind(allowed.schoolId).all(),
    env.CONTROL_DB.prepare("SELECT id, full_name, employee_code FROM teachers WHERE school_id = ? AND status = 'active' ORDER BY full_name").bind(allowed.schoolId).all(),
  ])
  return apiJson({ subjects: subjects.results || [], classes: classes.results || [], teachers: teachers.results || [] })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const body = await parseBody(request)
  if (!body) return apiJson({ error: 'Enter the subject details.' }, 400)
  const id = clean(body.id, 80) || crypto.randomUUID()
  const name = clean(body.name, 100)
  const code = clean(body.code, 30)
  const teacherId = clean(body.teacherId, 80)
  const bindSubjectId = clean(body.bindSubjectId, 80)
  const classIds = arrayOfStrings(body.classIds, 30)
  const groups = arrayOfStrings(body.groups, 8).filter((group) => ['Common', 'Science', 'Humanities', 'Business Studies'].includes(group))
  const markingTypes = validatedMarkingTypes(body.markingTypes)
  const numericalNumber = body.numericalNumber === '' || body.numericalNumber == null ? null : Number(body.numericalNumber)
  const amount = body.amount === '' || body.amount == null ? 0 : Number(body.amount)
  const status = body.status === 'inactive' ? 'inactive' : 'active'
  if (!name || !classIds.length || !markingTypes) return apiJson({ error: 'Subject name, at least one class, and valid marking options are required.' }, 400)
  if (numericalNumber !== null && (!Number.isInteger(numericalNumber) || numericalNumber < 0 || numericalNumber > 9999)) return apiJson({ error: 'Numerical number must be a whole number from 0 to 9999.' }, 400)
  if (!Number.isInteger(amount) || amount < 0 || amount > 1000000) return apiJson({ error: 'Amount must be a whole number from 0 to 1,000,000.' }, 400)
  if (!await validClasses(env, allowed.schoolId, classIds)) return apiJson({ error: 'Choose active classes from this school.' }, 400)
  if (!await validTeacher(env, allowed.schoolId, teacherId)) return apiJson({ error: 'Choose an active in-charge teacher from this school.' }, 400)
  if (bindSubjectId && !await env.CONTROL_DB.prepare('SELECT id FROM subjects WHERE id = ? AND school_id = ? AND id != ?').bind(bindSubjectId, allowed.schoolId, id).first()) return apiJson({ error: 'Choose a related subject from this school.' }, 400)
  const existing = await env.CONTROL_DB.prepare('SELECT id FROM subjects WHERE id = ? AND school_id = ?').bind(id, allowed.schoolId).first()
  const statements = [existing
    ? env.CONTROL_DB.prepare(`UPDATE subjects SET name = ?, code = ?, numerical_number = ?, amount = ?, group_names = ?, bind_subject_id = ?, teacher_id = ?, marking_types = ?, status = ?, updated_at = datetime('now') WHERE id = ? AND school_id = ?`).bind(name, code || null, numericalNumber, amount, JSON.stringify(groups), bindSubjectId || null, teacherId || null, JSON.stringify(markingTypes), status, id, allowed.schoolId)
    : env.CONTROL_DB.prepare(`INSERT INTO subjects (id, school_id, name, code, numerical_number, amount, group_names, bind_subject_id, teacher_id, marking_types, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, allowed.schoolId, name, code || null, numericalNumber, amount, JSON.stringify(groups), bindSubjectId || null, teacherId || null, JSON.stringify(markingTypes), status),
  ]
  const placeholders = classIds.map(() => '?').join(', ')
  const { results: priorAssignments = [] } = await env.CONTROL_DB.prepare(`SELECT class_id FROM subject_classes WHERE school_id = ? AND subject_id = ? AND class_id NOT IN (${placeholders})`)
    .bind(allowed.schoolId, id, ...classIds).all<{ class_id: string }>()
  if (priorAssignments.length) {
    const removeIds = priorAssignments.map((row) => row.class_id)
    statements.push(env.CONTROL_DB.prepare(`DELETE FROM subject_classes WHERE school_id = ? AND subject_id = ? AND class_id IN (${removeIds.map(() => '?').join(', ')})`).bind(allowed.schoolId, id, ...removeIds))
  }
  for (const classId of classIds) statements.push(env.CONTROL_DB.prepare(`INSERT INTO subject_classes (id, school_id, class_id, subject_id, teacher_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT (school_id, class_id, subject_id) DO UPDATE SET teacher_id = excluded.teacher_id`).bind(crypto.randomUUID(), allowed.schoolId, classId, id, teacherId || null))
  try { await env.CONTROL_DB.batch(statements) } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return apiJson({ error: 'A subject with that name or code already exists.' }, 409)
    throw error
  }
  return apiJson({ ok: true, id, updated: Boolean(existing) }, existing ? 200 : 201)
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const id = new URL(request.url).searchParams.get('id')?.trim() || ''
  if (!id) return apiJson({ error: 'Subject ID is required.' }, 400)
  const references = await env.CONTROL_DB.prepare(`SELECT
    (SELECT COUNT(*) FROM student_subjects WHERE school_id = ? AND subject_id = ?) AS student_assignments,
    (SELECT COUNT(*) FROM subject_classes WHERE school_id = ? AND subject_id = ?) AS class_assignments,
    (SELECT COUNT(*) FROM subjects WHERE school_id = ? AND bind_subject_id = ?) AS related_subjects`)
    .bind(allowed.schoolId, id, allowed.schoolId, id, allowed.schoolId, id).first<{ student_assignments: number; class_assignments: number; related_subjects: number }>()
  if ((references?.student_assignments || 0) + (references?.class_assignments || 0) + (references?.related_subjects || 0) > 0) return apiJson({ error: 'This subject is assigned to classes, students, or related subjects. Mark it inactive to preserve those records.' }, 409)
  const result = await env.CONTROL_DB.prepare('DELETE FROM subjects WHERE id = ? AND school_id = ?').bind(id, allowed.schoolId).run()
  if (!result.meta.changes) return apiJson({ error: 'Subject not found.' }, 404)
  return apiJson({ ok: true })
}
