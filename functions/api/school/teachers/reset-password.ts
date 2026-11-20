import { apiJson, getSchoolAccess } from '../../../_lib/school-access'
import type { Env } from '../../../_lib/auth'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const schoolId = new URL(request.url).searchParams.get('schoolId')?.trim() || ''
  if (!schoolId) return apiJson({ error: 'School ID is required.' }, 400)
  const allowed = await getSchoolAccess(request, env, schoolId)
  if (allowed.response) return allowed.response

  let body: { teacherId?: unknown }
  try { body = await request.json() as typeof body } catch { return apiJson({ error: 'Select a teacher.' }, 400) }
  const teacherId = typeof body.teacherId === 'string' ? body.teacherId : ''
  const teacher = await env.CONTROL_DB.prepare('SELECT id, email FROM teachers WHERE id = ? AND school_id = ? AND archived_at IS NULL')
    .bind(teacherId, schoolId).first<{ id: string; email: string | null }>()
  if (!teacher) return apiJson({ error: 'Teacher not found.' }, 404)
  if (!teacher.email) return apiJson({ error: 'Add an email address to this teacher profile before resetting its login.' }, 400)
  const user = await env.CONTROL_DB.prepare(`SELECT u.id FROM "user" u
    INNER JOIN school_memberships m ON m.user_id = u.id AND m.school_id = ? AND m.role = 'teacher'
    WHERE lower(u.email) = lower(?)`)
    .bind(schoolId, teacher.email).first<{ id: string }>()
  if (!user) return apiJson({ error: 'No teacher login is linked to this school and email yet.' }, 404)
  const account = await env.CONTROL_DB.prepare("SELECT id FROM account WHERE userId = ? AND providerId = 'credential' AND password IS NOT NULL")
    .bind(user.id).first<{ id: string }>()
  if (!account) return apiJson({ error: 'This teacher does not have a password login to reset.' }, 409)

  const random = new Uint8Array(24)
  crypto.getRandomValues(random)
  const token = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000)
  await env.CONTROL_DB.prepare("DELETE FROM verification WHERE value = ? AND identifier LIKE 'reset-password:%'").bind(user.id).run()
  await env.CONTROL_DB.prepare('INSERT INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), `reset-password:${token}`, user.id, expiresAt.toISOString(), now.toISOString(), now.toISOString()).run()
  await env.CONTROL_DB.prepare('INSERT INTO audit_events (id, actor_id, event_type, detail_json) VALUES (?, ?, ?, ?)')
    .bind(crypto.randomUUID(), allowed.userId, 'teacher.password_reset_requested', JSON.stringify({ schoolId, teacherId })).run()
  const resetUrl = new URL(`/?resetToken=${encodeURIComponent(token)}`, request.url).toString()
  return apiJson({ resetUrl, expiresAt: expiresAt.toISOString(), delivery: 'manual' })
}
