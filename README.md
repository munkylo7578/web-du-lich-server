# web-server-du-lich

Nx monorepo for the travel admin Next.js app and shared database library.

## Workspace layout

- `apps/admin`: Next.js 16 admin application.
- `libs/database`: internal Nx TypeScript library exported as `@database`.
- `drizzle.config.ts`: Drizzle Kit config that reads schemas from `libs/database/src/schema.ts`.

## Common commands

```bash
npm run dev
npm run build
npm run start
npm run lint
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

Run these commands from the repository root:

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
NODE_ENV=production
```

Because PM2 starts the app with `--cwd apps/admin`, put production variables in `apps/admin/.env.production`, or pass them directly when starting PM2.

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

If the login screen loads but pressing **Đăng nhập** shows a generic server error, first verify that PM2 has the required environment variables:

```bash
pm2 env web-server-du-lich-admin
```

Common causes:

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
import { db, tours, tourTranslations } from "@database";
```

Keep Drizzle table definitions and DB persistence-only snapshot types inside `libs/database`. Avoid importing application domain classes into the database library so it remains reusable by future apps in this monorepo.

## Nx commands used for migration

Current Nx CLI commands used to initialize and generate the workspace pieces:

```bash
npx nx@latest init --interactive=false --nxCloud=false --plugins=skip --cacheable=build,lint
npx nx add @nx/js@latest --interactive=false
npx nx g @nx/js:lib --directory=libs/database --name=database --importPath=@database --bundler=tsc --linter=eslint --unitTestRunner=none --minimal=true --useProjectJson=true --skipFormat
npx nx g @nx/next:application --directory=apps/admin --name=admin --appDir=true --src=true --style=css --linter=eslint --e2eTestRunner=none --unitTestRunner=none --useProjectJson=true --skipPackageJson=true --skipFormat
```
