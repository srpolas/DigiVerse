interface Env {
  CONTROL_DB?: D1Database
  SCHOOL_FILES?: R2Bucket
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return Response.json({
    name: 'DigiVerse',
    status: 'ok',
    services: {
      database: Boolean(env.CONTROL_DB),
      schoolFileStorage: Boolean(env.SCHOOL_FILES),
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
