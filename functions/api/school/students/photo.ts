import { getSchoolAccess, apiJson } from '../../../_lib/school-access'
import type { Env } from '../../../_lib/auth'

async function access(request: Request, env: Env) {
  const schoolId = new URL(request.url).searchParams.get('schoolId')?.trim() || ''
  if (!schoolId) return { response: apiJson({ error: 'School ID is required.' }, 400) }
  return { ...(await getSchoolAccess(request, env, schoolId)), schoolId }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  const studentId = new URL(request.url).searchParams.get('studentId')?.trim() || ''
  const student = await env.CONTROL_DB.prepare('SELECT photo_object_key FROM students WHERE id = ? AND school_id = ?')
    .bind(studentId, allowed.schoolId).first<{ photo_object_key: string | null }>()
  if (!student) return apiJson({ error: 'Student not found.' }, 404)
  if (!student.photo_object_key || !env.SCHOOL_FILES) return new Response(null, { status: 404 })
  const object = await env.SCHOOL_FILES.get(student.photo_object_key)
  if (!object) return new Response(null, { status: 404 })
  return new Response(object.body, { headers: {
    'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
    'Cache-Control': 'private, max-age=300',
    'ETag': object.httpEtag,
    'X-Content-Type-Options': 'nosniff',
  } })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await access(request, env)
  if (allowed.response) return allowed.response
  if (!env.SCHOOL_FILES) return apiJson({ error: 'Student photo storage is not configured.' }, 503)
  const studentId = new URL(request.url).searchParams.get('studentId')?.trim() || ''
  const student = await env.CONTROL_DB.prepare('SELECT id, photo_object_key FROM students WHERE id = ? AND school_id = ?')
    .bind(studentId, allowed.schoolId).first<{ id: string; photo_object_key: string | null }>()
  if (!student) return apiJson({ error: 'Save the student record before uploading a photo.' }, 404)
  const form = await request.formData()
  const file = form.get('photo')
  if (!(file instanceof File) || file.size === 0) return apiJson({ error: 'Choose a student photo.' }, 400)
  if (file.size > 5 * 1024 * 1024) return apiJson({ error: 'Student photos must be 5 MB or smaller.' }, 413)
  const types: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  const extension = types[file.type]
  if (!extension) return apiJson({ error: 'Use a JPG, PNG, or WebP image.' }, 415)
  const key = `schools/${allowed.schoolId}/students/${student.id}/profile.${extension}`
  await env.SCHOOL_FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  await env.CONTROL_DB.prepare("UPDATE students SET photo_object_key = ?, updated_at = datetime('now') WHERE id = ? AND school_id = ?")
    .bind(key, student.id, allowed.schoolId).run()
  if (student.photo_object_key && student.photo_object_key !== key) await env.SCHOOL_FILES.delete(student.photo_object_key)
  return apiJson({ ok: true })
}
