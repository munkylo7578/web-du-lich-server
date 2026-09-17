# web-server-du-lich

Nx monorepo for the travel admin Next.js app, read-only NestJS content API, and shared database library.

## Workspace layout

- `apps/admin`: Next.js 16 admin application.
- `apps/api`: NestJS read-only REST API consumed by server-side frontends.
- `libs/database`: internal Nx TypeScript library exported as `@database`.
- `drizzle.config.ts`: Drizzle Kit config that reads schemas from `libs/database/src/schema.ts`.

## Common commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run api:dev
npm run api:build
npm run api:test
```

Equivalent Nx commands:

```bash
npx nx dev admin
npx nx build admin
npx nx eslint:lint admin
npx nx build database
npx nx eslint:lint database
```

## Run admin with PM2 on Ubuntu

Use this flow when deploying the admin Next.js app behind Nginx on an Ubuntu server.

### 1. Install dependencies and build

Use Node.js 22 LTS (Node.js 16 is not supported). Configure the root [.env](.env) as described below **before building**, then run these commands from the repository root:

```bash
npm ci
npm run build
```

The build command runs the Nx `admin` build target, which builds the Next.js app in `apps/admin`.

### 2. Configure production environment variables

The login flow and admin pages require these variables in production:

```bash
AUTH_LOGIN_USERNAME=your_admin_username
AUTH_LOGIN_PASSWORD=your_admin_password
AUTH_SESSION_SECRET=change_this_to_a_random_secret_with_at_least_32_characters
DATABASE_URL=postgres://user:password@host:5432/database
MAX_UPLOAD_IMAGE_MB=50
```

Store these values in the repository-root [.env](.env), not [apps/admin/.env.production](apps/admin/.env.production). The admin [configuration](apps/admin/next.config.js) explicitly loads environment files from the repository root for development, build, and production startup, even when PM2 starts inside [apps/admin](apps/admin).

The standard Next.js environment precedence is preserved: explicit process/PM2 environment variables come first, followed by root environment-specific local files, the root local file, the root environment-specific file, and finally the root [.env](.env). For a single-file setup, keep your application variables only in the root [.env](.env) and remove conflicting overrides. Let Next.js set the mode for development versus production rather than setting it permanently in the shared file. Secrets are not exposed through the client configuration.

**Migrating an existing server:**

1. Securely back up [apps/admin/.env.production](apps/admin/.env.production) outside the repository and public directories. Merge its required production values into the root [.env](.env); do not overwrite production credentials with development values. Set the image upload limit to 50.
2. Remove [apps/admin/.env.production](apps/admin/.env.production) on the server, along with any other conflicting app-level environment files. These server-only files are not removed by a Git deployment.
3. Remove or update stale PM2/shell overrides, especially the previous 20 MB image-upload setting. Restarting with environment refresh does not necessarily remove variables retained in a saved PM2 process; recreate that process from a clean environment if needed, preserving its port and other launch options.
4. Install dependencies and rebuild without the Nx cache, then restart the existing admin process and save the PM2 process list. Use the process's actual name (for example, travel-admin) instead of the example name below.

```bash
npm ci
npx nx build admin --skip-nx-cache
pm2 restart web-server-du-lich-admin --update-env
pm2 save
```

Keep the root [.env](.env) out of Git and restrict its permissions to the deployment user. Ensure it is present at both build time and runtime. Changing public build-time variables requires a rebuild; changing server-only variables requires a process restart. Relative upload paths still resolve from [apps/admin](apps/admin), so preserve the existing upload directory or use an absolute path.

### 3. Start the admin app with PM2

Run this command from the repository root:

```bash
pm2 start "npx next start" --name web-server-du-lich-admin --cwd apps/admin
pm2 save
```

The app will run with Next.js production mode from the `apps/admin` directory. Configure Nginx to proxy traffic to the port used by `next start`, usually `3000` unless `PORT` is set.

### 4. Useful PM2 commands

```bash
pm2 status
pm2 show web-server-du-lich-admin
pm2 logs web-server-du-lich-admin --lines 200
pm2 restart web-server-du-lich-admin --update-env
pm2 stop web-server-du-lich-admin
pm2 delete web-server-du-lich-admin
pm2 save
```

### 5. Troubleshooting login server errors

If the login screen loads but pressing **Đăng nhập** shows a generic server error, first verify the required values in the root [.env](.env) and check for stale PM2 overrides. Inspect PM2's environment locally; do not share its output because it may contain secrets. Use the numeric process ID shown by PM2:

```bash
pm2 status
# Replace 2 with the admin process ID from pm2 status.
pm2 env 2
```

Common causes:

- The root [.env](.env) is missing from the deployed repository, or a PM2/root environment-specific override still contains old values. PM2's environment listing shows inherited variables, not necessarily values loaded later by Next.js.
- `AUTH_LOGIN_USERNAME` or `AUTH_LOGIN_PASSWORD` is missing.
- `AUTH_SESSION_SECRET` is missing or shorter than 32 characters.
- `DATABASE_URL` is missing or cannot connect after login redirects to the admin pages.

After changing environment variables, restart with:

```bash
pm2 restart web-server-du-lich-admin --update-env
pm2 save
```

## Database commands

Set `DATABASE_URL` in `.env` before running database commands.

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
```

Equivalent Nx commands:

```bash
npx nx db:generate database
npx nx db:migrate database
npx nx db:push database
npx nx db:studio database
```

## Shared database usage

Application code should import database client and schema objects from `@database`:

```ts
import { db, tours, tourTranslations } from '@database';
```

Keep Drizzle table definitions and DB persistence-only snapshot types inside `libs/database`. Avoid importing application domain classes into the database library so it remains reusable by future apps in this monorepo.

## Read-only content API

Copy [`.env.example`](.env.example), set `DATABASE_URL`, and set one or more comma-separated `API_KEYS` of at least 32 characters. During rotation, deploy both the old and new key, update callers, then remove the old key. Start locally with `npm run api:dev`; the default address is `http://localhost:3001/api/v1`.

Content routes require both `x-api-key` and an explicit `locale=vi|en` query parameter:

- `GET /api/v1/tours?page=1&limit=20&locale=en`
- `GET /api/v1/tours/:id?locale=vi`
- `GET /api/v1/destinations` and `GET /api/v1/destinations/:id`
- `GET /api/v1/services` and `GET /api/v1/services/:id`
- `GET /api/v1/settings` and `GET /api/v1/settings/:key`
- Public checks: `GET /api/v1/health/live` and `GET /api/v1/health/ready`

Service responses include a stable `category` key: `accommodation`, `transportation`, or `tourguide`. Destination responses include `latitude` and `longitude` on each Vietnamese ward. These coordinates are derived from `ST_PointOnSurface(gis_wards.geom)` and are `null` when GIS geometry is unavailable. Swagger documents the concrete response fields for list and detail endpoints.

If an entity lacks the requested translation, the API falls back to Vietnamese and reports `requested`, `effective`, and `fallback` in its locale metadata. The settings endpoints return every row in the site settings table; do not store private or secret values there. Swagger is available at `/api/v1/docs` when `API_DOCS_ENABLED=true`; disable it or protect it at Nginx in production.

### Nuxt/Nitro integration

Keep the API key in private runtime configuration—not `runtimeConfig.public`—and call NestJS only from Nitro handlers or server utilities:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    travelApiKey: process.env.NUXT_TRAVEL_API_KEY,
    travelApiBase: process.env.NUXT_TRAVEL_API_BASE,
  },
});

// server/api/tours.get.ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const locale = getQuery(event).locale === 'en' ? 'en' : 'vi';
  return $fetch('/tours', {
    baseURL: config.travelApiBase,
    query: { locale, page: 1, limit: 20 },
    headers: { 'x-api-key': config.travelApiKey },
    timeout: 5000,
  });
});
```

Do not call NestJS directly from browser components: that exposes the shared key. Always use HTTPS, configure Nginx rate limits and request-size limits, and set `API_TRUST_PROXY=1` only when exactly one trusted proxy sits in front of NestJS.

### API production process

Build with `npm run api:build`, then use `pm2 start dist/apps/api/main.js --name web-server-du-lich-api`. Put secrets in PM2's environment or another secret manager, proxy `/api/` through HTTPS Nginx, and restart with `pm2 restart web-server-du-lich-api --update-env` after rotation.

## Nx commands used for migration

Current Nx CLI commands used to initialize and generate the workspace pieces:

```bash
npx nx@latest init --interactive=false --nxCloud=false --plugins=skip --cacheable=build,lint
npx nx add @nx/js@latest --interactive=false
npx nx g @nx/js:lib --directory=libs/database --name=database --importPath=@database --bundler=tsc --linter=eslint --unitTestRunner=none --minimal=true --useProjectJson=true --skipFormat
npx nx g @nx/next:application --directory=apps/admin --name=admin --appDir=true --src=true --style=css --linter=eslint --e2eTestRunner=none --unitTestRunner=none --useProjectJson=true --skipPackageJson=true --skipFormat
```
