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
  const url = new URL(request.url)
  const classId = url.searchParams.get('classId')?.trim() || ''
  if (!classId) return apiJson({ error: 'Choose a class to load students.' }, 400)
  if (!await env.CONTROL_DB.prepare('SELECT id FROM classes WHERE id = ? AND school_id = ?').bind(classId, allowed.schoolId).first()) return apiJson({ error: 'Class not found.' }, 404)
  const sectionId = url.searchParams.get('sectionId')?.trim() || ''
  const groupName = url.searchParams.get('groupName')?.trim() || ''
  const search = url.searchParams.get('search')?.trim() || ''
  let sql = `SELECT id, class_id, section_id, student_code, roll_number, full_name, group_name, status,
    guardian_name, guardian_phone, full_name_bn,
    COALESCE((SELECT customized FROM student_subject_profiles WHERE school_id = students.school_id AND student_id = students.id), 0) AS customized
    FROM students WHERE school_id = ? AND class_id = ? AND status = 'active'`
  const params: string[] = [allowed.schoolId, classId]
  if (sectionId) { sql += ' AND section_id = ?'; params.push(sectionId) }
  if (groupName) { sql += ' AND group_name = ?'; params.push(groupName) }
  if (search) { sql += ' AND (full_name LIKE ? OR student_code LIKE ? OR roll_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  sql += ' ORDER BY CAST(roll_number AS INTEGER), roll_number LIMIT 500'
  const [{ results: studentResults = [] }, { results: subjectResults = [] }, { results: customResults = [] }, { results: sections = [] }] = await Promise.all([
    env.CONTROL_DB.prepare(sql).bind(...params).all<{ id: string; class_id: string; section_id: string | null; student_code: string; roll_number: string; full_name: string; group_name: string; status: string; guardian_name: string | null; guardian_phone: string | null; full_name_bn: string | null; customized: number }>(),
    env.CONTROL_DB.prepare(`SELECT subjects.id, subjects.name, subjects.code, subjects.numerical_number, subjects.group_names, subject_classes.teacher_id,
      COALESCE(teachers.full_name, '') AS teacher_name FROM subject_classes INNER JOIN subjects ON subjects.id = subject_classes.subject_id AND subjects.school_id = subject_classes.school_id
      LEFT JOIN teachers ON teachers.id = subject_classes.teacher_id AND teachers.school_id = subject_classes.school_id
      WHERE subject_classes.school_id = ? AND subject_classes.class_id = ? AND subjects.status = 'active' ORDER BY subjects.numerical_number, subjects.name`).bind(allowed.schoolId, classId).all<{ id: string }>(),
    env.CONTROL_DB.prepare(`SELECT student_id, subject_id FROM student_subjects WHERE school_id = ? AND student_id IN (SELECT id FROM students WHERE school_id = ? AND class_id = ? AND status = 'active')`).bind(allowed.schoolId, allowed.schoolId, classId).all<{ student_id: string; subject_id: string }>(),
    env.CONTROL_DB.prepare('SELECT id, class_id, name FROM sections WHERE school_id = ? AND class_id = ? AND status = ? ORDER BY sort_order, name').bind(allowed.schoolId, classId, 'active').all(),
  ])
  const byStudent = new Map<string, string[]>()
  for (const row of customResults) byStudent.set(row.student_id, [...(byStudent.get(row.student_id) || []), row.subject_id])
  const appliesToGroup = (groupNames: string, groupName: string) => {
    try { const groups = JSON.parse(groupNames || '[]') as string[]; return !groups.length || groups.includes(groupName) || groups.includes('Common') }
    catch { return true }
  }
  const students = studentResults.map((student) => ({ ...student, subject_ids: student.customized ? (byStudent.get(student.id) || []) : subjectResults.filter((subject) => appliesToGroup(subject.group_names, student.group_name)).map((subject) => subject.id) }))
  return apiJson({ students, subjects: subjectResults, sections: sections || [] })
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return apiJson({ error: 'Choose the student subjects.' }, 400) }
  const studentId = clean(body.studentId, 80)
  const resetToDefault = body.resetToDefault === true
  const subjectIds = Array.isArray(body.subjectIds) ? [...new Set(body.subjectIds.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))].slice(0, 100) : null
  if (!studentId || (!subjectIds && !resetToDefault)) return apiJson({ error: 'Choose the student and subject list.' }, 400)
  const student = await env.CONTROL_DB.prepare('SELECT id, class_id, group_name FROM students WHERE id = ? AND school_id = ? AND status = ?').bind(studentId, allowed.schoolId, 'active').first<{ id: string; class_id: string; group_name: string }>()
  if (!student) return apiJson({ error: 'Active student not found.' }, 404)
  if (resetToDefault) {
    await env.CONTROL_DB.batch([
      env.CONTROL_DB.prepare('DELETE FROM student_subjects WHERE school_id = ? AND student_id = ?').bind(allowed.schoolId, studentId),
      env.CONTROL_DB.prepare('DELETE FROM student_subject_profiles WHERE school_id = ? AND student_id = ?').bind(allowed.schoolId, studentId),
    ])
    return apiJson({ ok: true, resetToDefault: true })
  }
  if (subjectIds!.length) {
    const placeholders = subjectIds!.map(() => '?').join(', ')
    const { results = [] } = await env.CONTROL_DB.prepare(`SELECT subject_classes.subject_id AS id, subjects.group_names FROM subject_classes INNER JOIN subjects ON subjects.id = subject_classes.subject_id AND subjects.school_id = subject_classes.school_id WHERE subject_classes.school_id = ? AND subject_classes.class_id = ? AND subject_classes.subject_id IN (${placeholders})`).bind(allowed.schoolId, student.class_id, ...subjectIds!).all<{ id: string; group_names: string }>()
    if (results.length !== subjectIds!.length) return apiJson({ error: 'Students can only be assigned subjects already assigned to their class.' }, 400)
    for (const subject of results) {
      try { const groups = JSON.parse(subject.group_names || '[]') as string[]; if (groups.length && !groups.includes(student.group_name) && !groups.includes('Common')) return apiJson({ error: 'A selected subject is not available for this student’s group.' }, 400) }
      catch { /* ignore malformed legacy group metadata */ }
    }
  }
  const statements = [
    env.CONTROL_DB.prepare('DELETE FROM student_subjects WHERE school_id = ? AND student_id = ?').bind(allowed.schoolId, studentId),
    env.CONTROL_DB.prepare(`INSERT INTO student_subject_profiles (school_id, student_id, customized, updated_at) VALUES (?, ?, 1, datetime('now')) ON CONFLICT (school_id, student_id) DO UPDATE SET customized = 1, updated_at = datetime('now')`).bind(allowed.schoolId, studentId),
    ...subjectIds!.map((subjectId) => env.CONTROL_DB.prepare('INSERT INTO student_subjects (school_id, student_id, subject_id) VALUES (?, ?, ?)').bind(allowed.schoolId, studentId, subjectId)),
  ]
  await env.CONTROL_DB.batch(statements)
  return apiJson({ ok: true, assigned: subjectIds!.length })
}
