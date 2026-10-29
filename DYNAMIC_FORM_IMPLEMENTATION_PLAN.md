# Dynamic Form Ecosystem — AI Coding Agent Implementation Plan

## 1. Project Overview

Build three separate but compatible components:

1. **Shared Form Schema** — the common schema contract used by the builder and renderer.

2. **Dynamic Form Library** — a reusable React library that renders forms from JSON schemas and manages form state, validation, calculations, and submissions.

3. **Standalone Form Builder Platform** — a web application with dedicated authentication, backend, database, private form ownership, schema editing, importing, exporting, and version management.

The Form Builder must allow authenticated users to create and manage their own forms through a visual interface instead of manually writing JSON.

The first use case is CA Assessment. Neither the Dynamic Form library nor the Form Builder may hardcode CA Assessment field names or business rules.

## Confirmed Technology and Repository Decisions

The following decisions have been agreed and should be treated as the target architecture. Repository inspection is still required before implementation, and existing constraints must be reported before proposing changes.

- **Repository model:** One Git repository organized as a modular monorepo using **npm workspaces**.
- **Web application:** React + Vite + TypeScript.
- **Backend API:** Node.js + Express + TypeScript.
- **Reusable packages:** `dynamic-form-core` and `dynamic-form-react`, maintained in the same repository but versioned and published independently when appropriate.
- **UI:** shadcn/ui as the primary builder UI approach, subject to inspection of the existing project and configuration.
- **Database:** PostgreSQL or MySQL; choose after inspecting the existing environment and explaining the recommendation. Do not silently assume one.
- **Deployment:** The web application and API have independent build/deployment workflows. Package publishing is separate from application deployment. A change to one project must not automatically deploy or publish unrelated projects.
- **Initial tooling:** Use npm workspaces. Do not introduce Turborepo or Nx until there is a demonstrated need.
- **Architecture principles:** Apply SLAP (Single Level of Abstraction Principle, assuming this is what the user means by “SLAPP”), SOLID, Clean Code, SRP, and modular design pragmatically. Avoid adding layers, interfaces, repositories, classes, or dependencies without a clear benefit.

Suggested target layout:

```text
form-platform/
├── apps/
│   ├── form-builder-web/       # React + Vite + TypeScript
│   └── form-builder-api/       # Express + TypeScript
├── packages/
│   ├── dynamic-form-core/      # Schema contract, validation, calculations
│   └── dynamic-form-react/     # Renderer, field components, React hooks
├── package.json               # npm workspaces
└── README.md
```

This is a target proposal, not permission to restructure files. The agent must inspect the actual repository, report existing conventions and risks, propose the required changes, and wait for explicit approval before modifying project files.

## 2. Mandatory Agent Workflow

### Phase 1: Inspect the repository

Before creating, editing, deleting, or moving any files:

1. Inspect the repository structure and identify the relevant projects.

2. Inspect the existing repository and determine how to adapt it to the agreed monorepo structure. The target is one Git repository using npm workspaces, with separate applications and packages. Do not assume the existing repository already matches this structure.

3. Inspect `package.json`, lockfiles, framework versions, TypeScript configuration, build tooling, and package manager conventions.

4. Identify existing UI components, shadcn/ui configuration, styling conventions, and reusable components.

5. Inspect existing form handling, validation, API clients, and asynchronous state patterns.

6. Review existing backend code, database configuration, migrations, authentication, and authorization conventions.

7. Inspect available tests, linting, formatting, and build commands.

8. Locate the legacy CA Assessment schema and any existing conversion artifacts, if available.

9. Identify compatibility constraints and dependencies that can be reused.

The target stack and monorepo direction are agreed below, but do not assume the current repository already uses them. Inspect the repository before proposing concrete file changes, migrations, or restructuring.

### Phase 2: Propose a concrete implementation plan

Report:

- Repository findings and relevant existing files.

- Recommended project and package boundaries.

- Recommended frontend and backend architecture.

- Authentication and authorization approach.

- Proposed database model and migration plan.

- Proposed schema contract and public APIs.

- Draft and published-version workflow.

- Proposed file changes.

- Dependencies to add, remove, or reuse.

- Implementation stages and testing strategy.

- Unresolved decisions, risks, and compatibility concerns.

**Stop and wait for explicit approval before modifying any files.**

If the repository is unavailable, ask the user to provide access or the relevant project files. Do not invent repository findings.

### General implementation rules

- No file modifications before approval.

- Preserve existing behavior unless a change is explicitly approved.

- Follow the inspected repository's conventions.

- Avoid unnecessary abstractions, dependencies, and design patterns.
- Apply SLAP, SOLID, Clean Code, SRP, and modular design pragmatically; do not force a class or abstraction for every method.
- Keep feature boundaries explicit and dependencies directed toward stable core modules. The schema/calculation core must not depend on React, Express, or the database.
- Use npm workspaces and the existing npm lockfile conventions; do not switch package managers without approval.
- Keep web deployment, API deployment, and npm package publishing independent.

- Keep the Dynamic Form library independent of the Form Builder and its backend.

- Enforce authorization on the server, not merely through UI visibility.

- Do not introduce CA Assessment-specific behavior into generic libraries.

- Do not silently decide unresolved requirements that affect data integrity or security.

- Implement in small, reviewable stages.

---

# Part A — System Architecture

## 3. Component Boundaries

### 3.1 Shared Form Schema

Defines the authoritative JSON format and TypeScript types understood by the builder and renderer.

### 3.2 Dynamic Form Library

Responsibilities:

- Render a form from a schema.

- Generate initial values.

- Manage values, validation, and touched state.

- Render conditional nested fields.

- Evaluate calculations.

- Support file and image inputs.

- Expose React hooks and UI adapters.

- Submit values through application-provided callbacks.

The library must not own user authentication, form ownership, schema persistence, or publication history.

### 3.3 Standalone Form Builder Platform

Responsibilities:

- User registration and login.

- Authenticated dashboard.

- Private form creation and management.

- Visual schema editor.

- Live form preview.

- JSON import and export.

- Draft saving.

- Publishing and version history.

- Restoring previous versions.

- Backend API integration.

### 3.4 Dedicated Backend and Database

Responsibilities:

- Authentication and session management.

- User and form ownership.

- Schema persistence.

- Draft and published-version management.

- Server-side schema validation.

- Authorization for every form and version operation.

- Audit metadata and concurrency protection.

The backend must not depend on the Dynamic Form renderer to enforce schema correctness or authorization.

### 3.5 Dependency direction

```text
Shared Form Schema
      ↑
      │
┌─────┴─────────┐
│               │

Dynamic Form   Form Builder
Library        Web Application
                 │
                 ▼
            Backend API
                 │
                 ▼
              Database
```

The Dynamic Form library and Form Builder remain separate modules/projects within the same monorepo. The builder may use the renderer for live previews, but the renderer must never depend on the builder. Keep package APIs explicit and avoid imports through another project’s internal source paths.

---

# Part B — Shared Schema Contract

## 4. Root Schema

Use a clean schema format. Do not use the legacy `component-list` structure as the new public format.

```ts
type FormSchema = {
  schemaVersion: 1;
  id: string;
  title?: string;
  fields: Field[];
};
```

`schemaVersion` identifies the schema format supported by the libraries. It is not the published version number of a particular form.

Use strongly typed TypeScript interfaces or discriminated unions.

Each field may support relevant properties such as:

- `name`

- `type`

- `label`

- `defaultValue`

- `required`

- `disabled`

- `readOnly`

- `placeholder`

- `helpText`

- `validation`

- `options`

- Calculation configuration

Use type-specific properties where appropriate rather than giving every field type every possible property.

Finalize exact property names after repository inspection and before implementation.

## 5. Supported Field Types

Plan for these v1 field types:

| Type          | Expected behavior             |
| ------------- | ----------------------------- |
| `text`        | Single-line text              |
| `textarea`    | Multiline text                |
| `number`      | Numeric input                 |
| `currency`    | Monetary input and formatting |
| `checkbox`    | Boolean input                 |
| `select`      | Single-choice dropdown        |
| `radio`       | Single-choice radio group     |
| `multiselect` | Multiple-choice selection     |
| `date`        | Date input                    |
| `time`        | Time input                    |
| `datetime`    | Date and time input           |
| `file`        | File selection                |
| `image`       | Image selection with preview  |
| `calculation` | Read-only derived value       |

All supported types must work consistently in the builder and renderer.

## 6. Options and Recursive Nested Fields

Option structure:

```ts
type Option = {
  label: string;
  value: string | number;
  fields?: Field[];
};
```

Only `select` and `radio` options support nested fields in v1.

Example:

```json
{
  "name": "business_type",

  "type": "radio",

  "label": "Business Type",

  "options": [
    {
      "label": "Agriculture",

      "value": "agriculture",

      "fields": [
        {
          "name": "crop_type",

          "type": "select",

          "label": "Crop Type",

          "options": [
            {
              "label": "Rice",

              "value": "rice",

              "fields": [
                {
                  "name": "field_area",

                  "type": "number",

                  "label": "Field Area"
                }
              ]
            }
          ]
        }
      ]
    },

    {
      "label": "Retail",

      "value": "retail"
    }
  ]
}
```

Requirements:

- Render fields along the currently selected option path.

- Support arbitrary reasonable recursive nesting.

- Keep answer values in a flat object.

- Require globally unique field names, including nested fields.

- Preserve hidden values in form state by default.

- Validate active visible fields by default.

- Define and document whether hidden values are included in submission payloads.

- Prevent unsupported nested fields on unrelated field types.

---

# Part C — Dynamic Form Library

## 7. Initial Values and Existing Data

Initial values must be generated automatically from the schema. Callers should not need to provide an `initialValues` object.

Suggested defaults:

Suggested defaults:

| Field type           | Default value |
| -------------------- | ------------- |
| Text and textarea    | `""`          |
| Number and currency  | `""`          |
| Select and radio     | `""`          |
| Checkbox             | `false`       |
| Multiselect          | `[]`          |
| Date, time, datetime | `""`          |
| File and image       | `null`        |
| Calculation          | Derived       |

A field's explicit `defaultValue` overrides the default for its type.

### Editing existing records

Support an `initialData` prop using flat schema field names.

- Generate defaults from the schema.

- Override defaults with existing data.

- Preserve defaults for missing fields.

- Recalculate derived values rather than trusting server-supplied calculated values.

- Do not unexpectedly overwrite edits when `initialData` changes.

- Define reset and optional reinitialization behavior.

Existing image URLs and newly selected browser `File` objects must be represented distinctly.

## 8. Calculation Engine

Use declarative JSON calculations, not arbitrary JavaScript expressions.

V1 supports addition and subtraction.

```json
{
  "name": "monthly_profit",

  "type": "calculation",

  "label": "Monthly Profit",

  "calculation": {
    "initialField": "selling_price",

    "steps": [
      {
        "operation": "subtract",

        "field": "expenses"
      }
    ]
  }
}
```

Requirements:

- Recalculate when dependencies change.

- Support references to nested fields by name.

- Display results as read-only.

- Define behavior for missing, empty, zero, and nonnumeric values.

- Detect invalid references and circular dependencies.

- Never trust stale calculated values from `initialData`.

- Keep calculation logic independent of UI and backend.

## 9. Validation and Hooks

Provide built-in validation for required fields, string length, numeric bounds, applicable format constraints, and active nested fields.

Allow optional external validation integration, such as Zod, without making it a mandatory dependency.

### `useDynamicForm`

Manages:

- `values`

- `errors`

- `touched`

- `isDirty`

- `isValid`

- `isValidating`

- `setValue`

- `setValues`

- `validate`

- `validateField`

- `reset`

- `getValues`

- `handleSubmit`

### `useFormSubmit`

Manages asynchronous submission:

- `isSubmitting`

- `error`

- `success`

- `submit`

- `resetStatus`

### `useFormData`

Manages loading existing data:

- `data`

- `isLoading`

- `error`

- `refetch`

Accept application-provided functions. Do not couple the hooks to a specific HTTP client.

Keep loading, validation, and submission states separate.

## 10. UI Adapters

### Primary adapter: shadcn/ui

- Reuse components and conventions from the consuming application.

- Avoid assuming all consuming projects have identical shadcn/ui configurations.

- Support custom field renderers.

- Keep UI-specific implementation out of the core.

### Fallback adapter: Bootstrap-style

- Provide Bootstrap-like controls and styling.

- Do not require the Bootstrap framework.

- Namespace CSS to reduce conflicts.

- Use the same form engine and schema.

### Public API

Illustrative API:

```tsx
import { DynamicForm } from '@your-scope/dynamic-form';

import { shadcnAdapter } from '@your-scope/dynamic-form/shadcn';

<DynamicForm
  schema={schema}
  initialData={initialData}
  ui={shadcnAdapter}
  onSubmit={handleSubmit}
/>;
```

Finalize props and package exports after repository inspection. The application controls API calls and file uploads unless a separate integration is explicitly agreed upon.

---

# Part D — Standalone Form Builder Platform

## 11. Delivery Model

Build a standalone web application with its own authentication, backend, and database.

Users must be able to manage their own forms through a visual editor. The platform must not require users to manually write JSON for normal authoring.

## 12. Authentication

Implement authentication specifically for the Form Builder.

Requirements:

- Registration.

- Login and logout.

- Secure session handling.

- Authentication-required routes.

- Protected backend endpoints.

- Appropriate password handling if using password-based authentication.

- Server-side authorization checks for all form operations.

Choose the implementation after inspecting the repository and its deployment environment. Do not invent OAuth providers or introduce third-party identity services without approval.

Additional features such as password reset, email verification, or multifactor authentication must be evaluated during planning and included if required by the deployment and security requirements.

## 13. Private Per-User Form Ownership

Every form belongs to one authenticated user.

Required behavior:

- Users can list their own forms.

- Users can create, view, edit, publish, import, export, and delete their own forms.

- Users cannot access another user's private forms or versions.

- The backend must derive the owner from the authenticated identity.

- Do not trust a client-supplied `owner_id`.

- Apply ownership checks to read, update, delete, publish, restore, import, export, and version-history endpoints.

- Return appropriate errors for unauthorized access without leaking private schema data.

V1 does not include shared editing, teams, organizations, or collaborative roles.

### Public access policy

Forms are private management resources. Do not introduce public form browsing or public schema endpoints in v1.

If public form rendering is needed later, it must be an explicitly designed feature with a separate access policy.

## 14. Form Dashboard

Provide a dashboard showing forms owned by the current user.

Each form should display relevant metadata, such as:

- Form title.

- Current published version, if any.

- Draft status.

- Last updated time.

- Last publication time, if available.

Provide actions to:

- Create a form.

- Open and edit a form.

- Preview a form.

- Import JSON.

- Export JSON.

- View version history.

- Delete a form, with appropriate confirmation.

Use pagination or search if justified by the expected number of forms and the existing project conventions.

## 15. Visual Form Editor

### Field palette

Allow adding all agreed v1 field types.

### Form canvas

Allow users to:

- Select a field for editing.

- Reorder fields.

- Duplicate fields.

- Delete fields.

- Preview conditional visibility.

- Preview calculated values.

Accessible move-up and move-down controls are acceptable if drag-and-drop adds unnecessary complexity.

### Field properties

Configure:

- Name and label.

- Placeholder and help text.

- Default value.

- Required status.

- Disabled and read-only status.

- Options.

- Validation.

- Type-specific properties.

Validate names globally across nested fields.

### Conditional fields

For select and radio options:

- Add, edit, remove, and reorder options.

- Configure labels and values.

- Add child fields to options.

- Recursively add nested select/radio fields.

- Visually represent the nesting hierarchy.

### Calculation editor

Allow users to choose a starting numeric field and add arithmetic steps using addition and subtraction.

The editor must generate the exact declarative calculation structure consumed by the Dynamic Form library.

### Live preview

Use the Dynamic Form library where practical. The preview must reflect the actual renderer's field behavior, nested visibility, validation, and calculations.

Preview state must not modify a saved schema unless the user makes an explicit schema change.

---

# Part E — Drafts, Publishing, and Version History

## 16. Required Versioning Model

**One working draft per form, with immutable published versions.**

A form may have:

- One current working draft.

- Zero or more published versions.

- One current published version, if publication has occurred.

The draft is editable. Published versions are read-only snapshots.

Do not support multiple concurrent draft branches in v1.

## 17. Draft Workflow

### Creating a form

1. The authenticated user creates a form.

2. The backend records its ownership.

3. The system creates its initial working draft.

4. The user edits and saves the draft.

### Editing an unpublished form

The user edits the working draft directly.

### Editing a published form

When a user edits a published form:

1. Open the existing working draft if one already exists.

2. Otherwise, create a working draft based on the current published version.

3. Save changes to the draft.

4. Keep the published version unchanged.

5. Allow previewing and validating the draft before publication.

The user should not have to manually copy a published schema to start editing.

### Publishing

When a user publishes:

1. Confirm the form belongs to the authenticated user.

2. Validate the complete schema on the backend.

3. Validate nested field names, options, and calculation dependencies.

4. Check that the draft has not been modified by another request since it was loaded.

5. Create a new immutable published version.

6. Update the form's current published-version reference.

7. Record publication metadata.

8. Preserve previous published versions.

Publication must be atomic. A failed publication must not leave the form pointing to a partially created version.

### Editing after publication

Changes always belong to the draft. They must never modify an existing published snapshot.

### Restoring a previous version

Restoration means copying a historical schema into the working draft. It does not rewrite history.

The restored draft can then be edited and published as a new version.

Example:

- Version 1 is published.

- Version 2 is published.

- The user restores version 1 into the draft.

- The user publishes it as version 3.

Version 1 and version 2 remain unchanged.

## 18. Version History UI

Display published versions with:

- Version number.

- Publication timestamp.

- Publisher or owner.

- Relevant metadata.

Allow the user to:

- View an older version.

- Preview its schema.

- Compare versions where feasible.

- Restore a version into the current draft.

Version comparison should focus on meaningful schema changes, such as field additions, removals, labels, defaults, validation, options, nested fields, and calculations.

Do not introduce a complicated diff engine if a straightforward structured comparison is sufficient.

Published versions must be immutable through both the UI and backend API.

---

# Part F — JSON Import and Export

## 19. Import

Support importing a schema JSON file into the builder.

Requirements:

1. Parse the JSON.

2. Validate the root structure and `schemaVersion`.

3. Validate field definitions recursively.

4. Detect globally duplicated field names.

5. Validate options and nested fields.

6. Validate calculation references and circular dependencies.

7. Present understandable errors with paths or field names.

8. Preserve all supported properties.

9. Avoid overwriting the current draft until the import has been validated and the user confirms replacement where necessary.

When the user imports into an existing form, the import updates the working draft only after validation and confirmation. It must not directly modify a published version.

If the imported schema is intended to create a new form, create a new private form owned by the authenticated user.

Define a safe policy for unknown or unsupported schema properties. Do not silently discard them.

## 20. Export

Allow the owner to export the current draft or a selected published version as JSON.

Requirements:

- Validate the selected schema before export.

- Produce JSON matching the shared schema contract.

- Preserve nested fields and calculations.

- Exclude builder-only editor state.

- Clearly distinguish draft exports from published-version exports.

- Enforce ownership for backend-loaded versions.

- Support importing an exported schema back into the builder without losing supported properties.

Export must work without a separate external service, although the authenticated application will still need access to its own backend when exporting a saved form.

---

# Part G — Dedicated Backend and Database

## 21. Backend Responsibilities

Build a dedicated backend for the standalone Form Builder.

The backend framework is agreed to be Node.js + Express + TypeScript. The authentication mechanism, database (PostgreSQL or MySQL), and deployment details must be finalized after repository inspection and approval.

The backend must provide functionality for:

- Registration and authentication.

- Session management.

- Private form CRUD.

- Draft retrieval and saving.

- Schema validation.

- Publishing.

- Published-version history.

- Restoring historical schemas to the draft.

- Importing and exporting saved schemas.

- Ownership authorization.

- Concurrency protection.

- Consistent error responses.

Do not couple the backend to the Dynamic Form UI adapters.

## 22. Proposed Database Model

Adapt the model to the selected database and existing conventions.

### `users`

Stores authenticated user accounts.

### `forms`

Stores form identity and ownership.

Suggested fields:

- `id`

- `owner_id`

- `key` or equivalent identifier

- `title`

- `draft_schema_json`, or a reference to the current draft record

- `draft_revision`

- `published_version_id`

- `created_at`

- `updated_at`

- `deleted_at`, if soft deletion is approved

### `form_versions`

Stores immutable published snapshots.

Suggested fields:

- `id`

- `form_id`

- `version`

- `schema_version`

- `schema_json`

- `published_by`

- `published_at`

- `created_at`

Enforce uniqueness of `(form_id, version)`.

The current published-version reference must belong to the same form. Enforce this through application logic and database constraints where supported.

An alternative design with a separate `form_drafts` table is acceptable if the agent explains why it fits the repository better. Avoid duplicating draft state unnecessarily.

### Relationships

- One user owns many forms.

- One form has one working draft.

- One form has many published versions.

- A form may have no published version yet.

- Each published version belongs to exactly one form.

## 23. Persistence and Concurrency

Requirements:

- Save draft changes without affecting published versions.

- Use transactions for publishing.

- Prevent duplicate published version numbers.

- Use a revision number, optimistic locking, or equivalent mechanism to prevent silent overwrites.

- Reject stale updates with a clear conflict response.

- Never let a client change ownership by sending another `owner_id`.

- Validate schemas on the backend even if the builder validates them on the client.

- Do not trust client-side checks as a security boundary.

## 24. Form Submissions Are Out of Scope for the Builder Backend

The Form Builder manages schemas, not completed end-user assessments.

Unless explicitly requested, do not implement a submission-management platform in this project.

If submission storage is introduced later, submissions should reference the exact published version used. Historical submissions must not be silently reinterpreted using a newer schema.

---

# Part H — Suggested Project Structure

## 25. Proposed Organization

Use the agreed npm-workspaces monorepo target below as the starting point. Adapt names and placement to the inspected repository, and do not restructure existing projects without justification and approval.

```text
form-platform/
├── apps/
│   ├── form-builder-web/       # React + Vite + TypeScript
│   └── form-builder-api/       # Express + TypeScript
├── packages/
│   ├── dynamic-form-core/      # Schema contract, validation, calculations
│   └── dynamic-form-react/     # Renderer, field components, React hooks
├── package.json               # npm workspaces
└── README.md
```

The web app and API are deployed independently. The two reusable packages are versioned and published independently when appropriate. Use npm workspaces for local development; do not add Turborepo or Nx unless the inspected project demonstrates a need. Each workspace should own its dependencies and scripts. Keep package exports stable and do not make published consumers depend on internal monorepo paths.

### Dynamic Form Library

Possible modules:

```text

dynamic-form/
├── src/
│   ├── core/
│   ├── components/
│   ├── hooks/
│   ├── adapters/
│   │   ├── shadcn/
│   │   └── bootstrap/
│   ├── validation/
│   └── index.ts
├── styles/
├── tests/
└── README.md
```

### Form Builder Web Application

Possible modules:

```text

form-builder/

├── src/
│   ├── auth/
│   ├── dashboard/
│   ├── editor/
│   ├── properties/
│   ├── conditional-fields/
│   ├── calculations/
│   ├── preview/
│   ├── import-export/
│   ├── version-history/
│   ├── api/
│   └── routes/
└── tests/

```

### Backend

Possible modules:

```text

form-builder-api/

├── src/
│   ├── auth/
│   ├── forms/
│   ├── drafts/
│   ├── publishing/
│   ├── versions/
│   └── schema-validation/
├── migrations/
└── tests/
```

These are logical boundaries, not a requirement to create one file per concept. Keep the implementation proportionate to the actual requirements.

---

# Part I — Testing and Acceptance Criteria

## 26. Dynamic Form Tests

Test:

- Schema validation.

- Automatic initial values.

- Existing data and reinitialization.

- Recursive nested-field rendering.

- Hidden-value preservation and submission policy.

- Active-field validation.

- Calculation updates.

- Invalid calculation references and cycles.

- Every supported field type.

- Image and file behavior.

- Reset and dirty state.

- Loading and submission states.

- Both UI adapters.

- Custom field renderers.

## 27. Form Builder Tests

Test:

- Creating and editing forms.

- Field addition, deletion, duplication, and reordering.

- Field property editing.

- Recursive conditional-field editing.

- Calculation editor behavior.

- Live preview.

- Valid and invalid JSON import.

- Export round trips.

- Preservation of supported schema properties.

- Draft saving and recovery.

- Publishing and version history.

- Restoring an older version to a new draft.

- Preventing changes to published snapshots.

## 28. Authentication and Authorization Tests

Test:

- Registration, login, and logout.

- Unauthenticated requests to protected endpoints.

- User A cannot read User B's forms.

- User A cannot update, delete, publish, restore, import into, or export User B's forms.

- Changing a client-supplied owner identifier cannot bypass authorization.

- Version endpoints enforce ownership through the parent form.

- Session expiration and invalid credentials.

- Concurrent draft updates.

- Authentication and authorization failures do not expose private schema content.

## 29. Backend and Versioning Tests

Test:

- Schema validation on the backend.

- Draft saves do not mutate published versions.

- Publishing creates an immutable snapshot.

- Repeated publication creates the next version according to the agreed workflow.

- Concurrent publication does not produce duplicate version numbers.

- Failed publication rolls back correctly.

- Restore creates a draft rather than rewriting history.

- The current published version points to the correct version.

- Imported schemas are validated before persistence.

- Deleted forms and their versions follow the approved deletion policy.

## 30. End-to-End Acceptance Criteria

- [ ] The Dynamic Form library is independent of the Form Builder.

- [ ] The Form Builder is a standalone web application.

- [ ] The builder has its own authentication and dedicated backend/database.

- [ ] Forms are private and managed only by their owners.

- [ ] The backend enforces authorization for all form and version operations.

- [ ] Each form has one working draft.

- [ ] Published versions are immutable.

- [ ] Editing a published form creates or opens a draft.

- [ ] Restoring an older version creates a draft, not a history rewrite.

- [ ] JSON import and export work.

- [ ] The builder supports recursive conditional fields.

- [ ] The calculation editor generates supported declarative calculations.

- [ ] Live preview uses the actual Dynamic Form behavior.

- [ ] The schema format is shared and versioned.

- [ ] CA Assessment can be recreated without CA-specific logic in the generic library.

- [ ] Tests, type checks, and builds pass.

- [ ] Documentation covers installation, schema design, authentication, API behavior, versioning, and deployment.

---

# Part J — Implementation Sequence

## 31. Proposed Stages

After repository inspection and approval:

1. Finalize repository and deployment boundaries.

2. Finalize the shared schema contract.

3. Confirm the agreed Express + TypeScript backend and finalize the authentication approach and database model based on repository findings.

4. Implement schema validation and initial-value generation.

5. Implement nested-field traversal and calculation evaluation.

6. Implement Dynamic Form state, validation, hooks, and the primary UI adapter.

7. Implement the fallback adapter and file/image support.

8. Implement backend authentication and private form ownership.

9. Implement form CRUD and draft persistence.

10. Implement publishing, immutable versions, and restoration.

11. Build the standalone builder dashboard and visual editor.

12. Implement recursive conditional-field and calculation editors.

13. Implement live preview.

14. Implement JSON import/export.

15. Connect the builder to the backend.

16. Recreate and verify the CA Assessment form.

17. Add comprehensive tests, documentation, and deployment configuration.

Reorder stages when the inspected repository requires it, but explain why.

Implement incrementally. Do not produce a large unreviewed change covering every project at once.

## 32. Required First Agent Response

Before any implementation, provide:

1. Repository findings.

2. Relevant existing files and conventions.

3. Recommended repository organization.

4. Confirm the agreed React + Vite + TypeScript frontend, Express + TypeScript backend, npm-workspaces monorepo, and independent release model; recommend authentication and database choices based on repository findings.

5. Proposed schema contract and public API.

6. Proposed database model and authorization boundaries.

7. Draft and publishing workflow.

8. Proposed file changes.

9. Dependencies and compatibility concerns.

10. Implementation sequence.

11. Testing and security plan.

12. Unresolved decisions.

**Then stop and wait for explicit approval. Do not modify any files until the user approves the proposed implementation plan.**
