# Dynamix Forms

Dynamix Forms is a modular platform for defining, rendering, and visually editing JSON-driven forms. The repository is an npm-workspaces monorepo with independently buildable applications and packages.

## Workspaces

- `packages/dynamic-form-core`: framework-independent schema, traversal, defaults, calculations, validation, and submission utilities.
- `packages/dynamic-form-react`: React renderer, hooks, adapters, and custom-renderer contracts.
- `apps/form-builder-web`: React/Vite visual form builder.
- `apps/form-builder-api`: Express API for authentication, ownership, drafts, and immutable versions.

## Local commands

Use Node.js 24 and npm 11. Copy [`apps/form-builder-api/.env.example`](./apps/form-builder-api/.env.example) to `apps/form-builder-api/.env`, then set `DATABASE_URL` and `APP_ORIGIN`. The API loads that file automatically. PostgreSQL must be running before the migration or API starts.

```bash
npm install
npm run db:migrate --workspace @dynamix-forms/form-builder-api
npm run dev --workspace @dynamix-forms/form-builder-api
# In another terminal:
npm run dev --workspace @dynamix-forms/form-builder-web
```

For repository-wide verification:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Pull requests and pushes to `main` run the same checks in [GitHub Actions](./.github/workflows/ci.yml), including dry-run package archives. CI does not publish npm packages or deploy the builder.

`DATABASE_URL` is an ordinary PostgreSQL connection string and works with Neon without provider-specific code. The local web server proxies `/api` to port 3001. The sample schema in [`examples/sample-customer-intake.json`](./examples/sample-customer-intake.json) can be imported into the builder.

## Implemented product boundaries

- Every form is private to one authenticated owner; ownership is derived from the server session.
- Authentication uses Argon2id password hashes and opaque `HttpOnly` cookies with 7-day rolling and 30-day absolute session limits.
- Each form has one optimistic-locked working draft and immutable published versions.
- Import/export uses the same strict, recursively validated v1 schema as the reusable packages.
- Deletion is soft by default. There is no automatic purge; the owner must explicitly permanently delete a form.
- The builder manages form schemas only. Completed end-user submissions are not stored.

API details and the runnable contract live in [apps/form-builder-api/README.md](./apps/form-builder-api/README.md) and [apps/form-builder-api/openapi.yaml](./apps/form-builder-api/openapi.yaml). Builder behavior is documented in [apps/form-builder-web/README.md](./apps/form-builder-web/README.md).

## Deployment direction

Configure the web application and Express API as separate Vercel projects sourced from this repository. Use `apps/form-builder-web` and `apps/form-builder-api` as their project roots while retaining access to the workspace packages. Supply a pooled Neon connection string as `DATABASE_URL`, plus `APP_ORIGIN`, `NODE_ENV=production`, and the optional `VITE_API_URL` described in the web README.

For reliable first-party cookie sessions, the preferred setup is for the browser to call a same-origin `/api` path on the web project that rewrites to the independently deployed API project. Custom domains under the same parent site, such as `forms.example.com` and `api.forms.example.com`, are another supported topology. Run the Drizzle migration against a Neon branch before promoting the API deployment.

## Package names

The intended public packages are:

- `@thuraaung2493/dynamic-form-core`
- `@thuraaung2493/dynamic-form-react`

Publishing requires control of the `thuraaung2493` scope on npm; a GitHub account with the same name does not automatically create or grant that npm scope.

The two public packages are at `0.1.0-beta.0`. See [Prerelease publishing](./PRERELEASE.md) for the manual, 2FA-approved npm staging workflow and the current release status.

Package usage and API documentation:

- [`@thuraaung2493/dynamic-form-core`](./packages/dynamic-form-core/README.md): schema fields, parsing, validation, calculations, traversal, and submission preparation.
- [`@thuraaung2493/dynamic-form-react`](./packages/dynamic-form-react/README.md): rendering, hooks, custom field renderers, full UI adapters, and shadcn integration.

## License

MIT © 2026 thuraaung2493. See [`LICENSE`](./LICENSE).

## Implementation plan

The approved product and architecture plan is recorded in [`DYNAMIC_FORM_IMPLEMENTATION_PLAN.md`](./DYNAMIC_FORM_IMPLEMENTATION_PLAN.md).
