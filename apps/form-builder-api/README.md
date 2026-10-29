# Dynamix Forms API

Express and TypeScript API for the private Dynamix Forms builder. It uses PostgreSQL through Drizzle, Argon2id passwords, and server-side opaque sessions.

## Local setup

Copy [`.env.example`](./.env.example) to `apps/form-builder-api/.env`, supply a standard PostgreSQL `DATABASE_URL`, and set `APP_ORIGIN` to the exact browser origin (`http://localhost:5173` for the default Vite server). The API loads this file automatically. Start PostgreSQL before migrating or running the API.

```bash
npm run db:migrate --workspace @dynamix-forms/form-builder-api
npm run dev --workspace @dynamix-forms/form-builder-api
```

Neon is the intended hosted provider, but no provider-specific database API is used. Use a pooled connection string in `DATABASE_URL` on Vercel.

## Authentication and security

- Passwords are 12–128 characters and require an uppercase letter and a Unicode punctuation/symbol character.
- Password hashes use Argon2id. Raw passwords and session tokens are never stored.
- The browser receives an `HttpOnly`, `SameSite=Lax` opaque session cookie. Production uses the `Secure` `__Host-dynamix_session` cookie.
- Sessions roll for 7 days of activity and never extend past their 30-day absolute lifetime.
- State-changing browser requests are checked against `APP_ORIGIN`.
- Form ownership always comes from the authenticated session. Client-supplied `ownerId` values are rejected.

## Drafts, publishing, and deletion

Each form has one valid working draft and a monotonically increasing `draftRevision`. Draft saves, imports, restores, and publishes require the revision the client loaded; stale requests receive `409 draft_revision_conflict` with `currentRevision`.

Publishing locks the form row, validates the shared schema, inserts an immutable snapshot, and changes the current-version pointer in one transaction. Restoring copies a historical snapshot into the draft and leaves history untouched.

Normal deletion is soft deletion. Nothing is purged automatically. The owner can restore a deleted form, or permanently delete it and all versions by sending the exact confirmation `PERMANENTLY DELETE` to the permanent-delete endpoint.

## API contract

The full contract is in [`openapi.yaml`](./openapi.yaml). All errors use:

```json
{
  "error": {
    "code": "draft_revision_conflict",
    "message": "The draft changed after it was loaded.",
    "details": { "currentRevision": 3 }
  }
}
```

The generated collection is in [`postman/`](../../postman/). Postman keeps the session cookie between requests.

## Verification

```bash
npm test --workspace @dynamix-forms/form-builder-api
npm run typecheck --workspace @dynamix-forms/form-builder-api
npm run build --workspace @dynamix-forms/form-builder-api
/Users/blackmonster/.local/bin/postman spec lint apps/form-builder-api/openapi.yaml --no-report-events
```

The integration suite uses an in-memory PostgreSQL-compatible engine because it does not need a local server. Run the migration against a real PostgreSQL or Neon branch before production deployment.
