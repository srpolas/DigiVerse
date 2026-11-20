import { getAuth, type Env } from './auth'

export async function getSchoolAccess(request: Request, env: Env, schoolId: string) {
  const auth = await getAuth(request, env)
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return { response: Response.json({ error: 'Sign in to continue.' }, { status: 401 }) }

  const membership = await env.CONTROL_DB.prepare(`
    SELECT role FROM school_memberships WHERE user_id = ? AND school_id = ?
  `).bind(session.user.id, schoolId).first<{ role: string }>()
  if (!membership) return { response: Response.json({ error: 'You do not have access to this school.' }, { status: 403 }) }
  if (request.method !== 'GET' && membership.role !== 'school_admin') {
    return { response: Response.json({ error: 'Only a school administrator can change school records.' }, { status: 403 }) }
  }
  return { userId: session.user.id, role: membership.role }
}

export function apiJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}
