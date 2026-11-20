import { getAuth, type Env } from '../../_lib/auth'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await getAuth(request, env)
  return auth.handler(request)
}
