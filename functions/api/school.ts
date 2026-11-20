import { getAuth, type Env } from '../_lib/auth'

interface SchoolRow {
  id: string
  name: string
  slug: string
  eiin: string | null
  timezone: string
  role: string
  studentCount: number
  classCount: number
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

async function signedInUser(request: Request, env: Env) {
  const auth = await getAuth(request, env)
  return auth.api.getSession({ headers: request.headers })
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await signedInUser(request, env)
  if (!session) return json({ error: 'Sign in to view your schools.' }, 401)

  const { results = [] } = await env.CONTROL_DB.prepare(`
    SELECT schools.id, schools.name, schools.slug, schools.eiin, schools.timezone,
      school_memberships.role,
      (SELECT COUNT(*) FROM students WHERE students.school_id = schools.id AND students.status = 'active') AS studentCount,
      (SELECT COUNT(*) FROM classes WHERE classes.school_id = schools.id) AS classCount
    FROM school_memberships
    INNER JOIN schools ON schools.id = school_memberships.school_id
    WHERE school_memberships.user_id = ?
    ORDER BY schools.created_at ASC
  `).bind(session.user.id).all<SchoolRow>()

  return json({ schools: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await signedInUser(request, env)
  if (!session) return json({ error: 'Sign in before setting up a school.' }, 401)

  let body: { name?: unknown; eiin?: unknown }
  try {
    body = await request.json() as { name?: unknown; eiin?: unknown }
  } catch {
    return json({ error: 'Enter your school details and try again.' }, 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const eiin = typeof body.eiin === 'string' ? body.eiin.trim() : ''
  if (name.length < 2 || name.length > 120) {
    return json({ error: 'School name must be between 2 and 120 characters.' }, 400)
  }
  if (eiin.length > 32) {
    return json({ error: 'EIIN must be 32 characters or fewer.' }, 400)
  }

  const slugBase = name.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'school'
  const school = {
    id: crypto.randomUUID(),
    name,
    slug: `${slugBase}-${crypto.randomUUID().slice(0, 8)}`,
    eiin: eiin || null,
    timezone: 'Asia/Dhaka',
  }

  await env.CONTROL_DB.batch([
    env.CONTROL_DB.prepare(`
      INSERT INTO schools (id, name, slug, eiin, timezone)
      VALUES (?, ?, ?, ?, ?)
    `).bind(school.id, school.name, school.slug, school.eiin, school.timezone),
    env.CONTROL_DB.prepare(`
      INSERT INTO school_memberships (id, school_id, user_id, role)
      VALUES (?, ?, ?, 'school_admin')
    `).bind(crypto.randomUUID(), school.id, session.user.id),
  ])

  return json({ school: { ...school, role: 'school_admin', studentCount: 0, classCount: 0 } }, 201)
}
