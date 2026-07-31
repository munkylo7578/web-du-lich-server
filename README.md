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
