# DigiVerse

DigiVerse is a school management application planned for schools with fewer than 500 students. The application uses Cloudflare Pages/Workers, one Cloudflare D1 database, and R2 for files.

## Data and authentication

- **D1 (`CONTROL_DB`)** is the only database. It stores Better Auth users, accounts and sessions, plus school memberships, classes, students and other school records. D1 is Cloudflare's managed SQLite-compatible database; a Worker cannot use a local SQLite file as persistent storage.
- **Better Auth** handles email/password registration, sign-in and sessions using the D1 binding.
- **R2 (`SCHOOL_FILES`)** stores photos and generated documents.
- The D1 database binding is deployment configuration in `wrangler.jsonc`. The app does not accept database credentials or switch D1 databases at runtime. A different D1 database is selected in Cloudflare configuration and deployed with Wrangler.

D1 does not provide Postgres-style row-level security. Keep D1 private behind Worker routes and validate the current Better Auth session and school membership on every school-data operation. Always include `school_id` in authorization checks and queries.

## Local setup

1. Install packages with `npm install`.
2. Create D1 with `npx wrangler d1 create digiverse` and R2 with `npx wrangler r2 bucket create digiverse-school-files`. Put the D1 ID in `wrangler.jsonc`.
3. Create a random Better Auth secret of at least 32 characters and put it in `.dev.vars` as `BETTER_AUTH_SECRET=...`. For production, use `npx wrangler secret put BETTER_AUTH_SECRET`.
4. Apply the D1 application migrations with `npx wrangler d1 migrations apply digiverse --local` and `--remote` for production.
5. Start the frontend with `npm run dev`. Use Wrangler Pages development to exercise Worker routes and D1/R2 bindings.

Better Auth creates and checks its required tables programmatically on the first `/api/auth/*` request in a Worker isolate, using its documented Cloudflare D1 migration support. DigiVerse school tables are kept in `migrations/d1/`.

After sign-in, an account without a school membership is guided through first-school setup. The setup API creates the school and assigns the creator the `school_admin` role in one D1 batch. The overview uses the saved school details and clearly shows empty student, class, and attendance totals. Student and class management are the next implementation slice.

## Current build slice

- DigiVerse workspace shell and dashboard preview.
- Cloudflare Pages configuration with D1 and R2 bindings.
- Better Auth email/password sign-in backed by D1.
- First-school onboarding with school administrator membership stored in D1.
- Starter school tables for memberships, academic years, classes, sections and students.
- Health endpoint for checking Cloudflare bindings.
