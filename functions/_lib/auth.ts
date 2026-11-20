import { betterAuth } from 'better-auth'
import { getMigrations } from 'better-auth/db/migration'

export interface Env {
  CONTROL_DB: D1Database
  SCHOOL_FILES?: R2Bucket
  BETTER_AUTH_SECRET: string
}

let schemaPromise: Promise<void> | null = null

export async function getAuth(request: Request, env: Env) {
  const baseURL = new URL(request.url).origin
  const auth = betterAuth({
    database: env.CONTROL_DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    advanced: { database: { generateId: 'uuid' } },
  })

  if (!schemaPromise) {
    schemaPromise = getMigrations(auth.options).then(async ({ runMigrations }) => {
      await runMigrations()
    }).catch((error) => {
      schemaPromise = null
      throw error
    })
  }
  await schemaPromise
  return auth
}
