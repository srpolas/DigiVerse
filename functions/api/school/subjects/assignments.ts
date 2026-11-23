import { apiJson, getSchoolAccess } from '../../../_lib/school-access'
import type { Env } from '../../../_lib/auth'

function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }

async function access(request: Request, env: Env) {
  const schoolId = new URL(request.url).searchParams.get('schoolId')?.trim() || ''
  if (!schoolId) return { response: apiJson({ error: 'School ID is required.' }, 400) }
  return { ...(await getSchoolAccess(request, env, schoolId)), schoolId }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const classId = new URL(request.url).searchParams.get('classId')?.trim() || ''
  const classes = await env.CONTROL_DB.prepare('SELECT id, name, sort_order, status FROM classes WHERE school_id = ? ORDER BY sort_order, name').bind(allowed.schoolId).all()
  if (!classId) return apiJson({ classes: classes.results || [], assigned: [] })
  if (!await env.CONTROL_DB.prepare('SELECT id FROM classes WHERE id = ? AND school_id = ?').bind(classId, allowed.schoolId).first()) return apiJson({ error: 'Class not found.' }, 404)
  const { results = [] } = await env.CONTROL_DB.prepare(`SELECT subject_classes.id AS assignment_id, subjects.id, subjects.name, subjects.code,
    subjects.numerical_number, subjects.amount, subjects.status, subject_classes.teacher_id,
    COALESCE(teachers.full_name, '') AS teacher_name,
    (SELECT COUNT(*) FROM students WHERE students.school_id = subject_classes.school_id AND students.class_id = subject_classes.class_id AND students.status = 'active') AS student_count
    FROM subject_classes INNER JOIN subjects ON subjects.id = subject_classes.subject_id AND subjects.school_id = subject_classes.school_id
    LEFT JOIN teachers ON teachers.id = subject_classes.teacher_id AND teachers.school_id = subject_classes.school_id
    WHERE subject_classes.school_id = ? AND subject_classes.class_id = ? ORDER BY subjects.numerical_number, subjects.name`)
    .bind(allowed.schoolId, classId).all()
  return apiJson({ classes: classes.results || [], assigned: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return apiJson({ error: 'Choose a class and subject.' }, 400) }
  const classId = clean(body.classId, 80)
  const subjectId = clean(body.subjectId, 80)
  const teacherId = clean(body.teacherId, 80)
  if (!classId || !subjectId) return apiJson({ error: 'Choose a class and subject.' }, 400)
  if (!await env.CONTROL_DB.prepare('SELECT id FROM classes WHERE id = ? AND school_id = ?').bind(classId, allowed.schoolId).first()) return apiJson({ error: 'Choose a class from this school.' }, 400)
  if (!await env.CONTROL_DB.prepare('SELECT id FROM subjects WHERE id = ? AND school_id = ? AND status = ?').bind(subjectId, allowed.schoolId, 'active').first()) return apiJson({ error: 'Choose an active subject from this school.' }, 400)
  if (teacherId && !await env.CONTROL_DB.prepare("SELECT id FROM teachers WHERE id = ? AND school_id = ? AND status = 'active'").bind(teacherId, allowed.schoolId).first()) return apiJson({ error: 'Choose an active teacher from this school.' }, 400)
  await env.CONTROL_DB.prepare(`INSERT INTO subject_classes (id, school_id, class_id, subject_id, teacher_id) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (school_id, class_id, subject_id) DO UPDATE SET teacher_id = excluded.teacher_id`)
    .bind(crypto.randomUUID(), allowed.schoolId, classId, subjectId, teacherId || null).run()
  return apiJson({ ok: true }, 201)
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const url = new URL(request.url)
  const classId = url.searchParams.get('classId')?.trim() || ''
  const subjectId = url.searchParams.get('subjectId')?.trim() || ''
  if (!classId || !subjectId) return apiJson({ error: 'Class and subject are required.' }, 400)
  const statements = [
    env.CONTROL_DB.prepare(`DELETE FROM student_subjects WHERE school_id = ? AND subject_id = ? AND student_id IN (SELECT id FROM students WHERE school_id = ? AND class_id = ?)`)
      .bind(allowed.schoolId, subjectId, allowed.schoolId, classId),
    env.CONTROL_DB.prepare('DELETE FROM subject_classes WHERE school_id = ? AND class_id = ? AND subject_id = ?').bind(allowed.schoolId, classId, subjectId),
  ]
  const results = await env.CONTROL_DB.batch(statements)
  if (!results[1]?.meta.changes) return apiJson({ error: 'This class subject assignment was not found.' }, 404)
  return apiJson({ ok: true })
}
