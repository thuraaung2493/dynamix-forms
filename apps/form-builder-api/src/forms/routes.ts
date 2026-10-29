import {
  parseFormSchema,
  SchemaValidationError,
  type FormSchema,
} from '@thuraaung2493/dynamic-form-core';
import { and, desc, eq, isNotNull, isNull, max } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import type { AppDatabase } from '../database/client.js';
import { forms, formVersions } from '../database/schema.js';
import { getAuthenticatedUser } from '../auth/session.js';
import { ApiError, asyncHandler } from '../http/errors.js';

const identifierSchema = z.string().uuid();
const keySchema = z.string().trim().min(1).max(120);
const titleSchema = z.string().trim().min(1).max(200);
const revisionSchema = z.number().int().min(1);

const createFormInputSchema = z.strictObject({
  key: keySchema,
  ownerId: z.never().optional(),
  schema: z.unknown().optional(),
  title: titleSchema,
});
const saveDraftInputSchema = z.strictObject({
  expectedRevision: revisionSchema,
  ownerId: z.never().optional(),
  schema: z.unknown(),
  title: titleSchema.optional(),
});
const publishInputSchema = z.strictObject({ expectedRevision: revisionSchema });
const restoreInputSchema = z.strictObject({ expectedRevision: revisionSchema });
const existingImportInputSchema = z.strictObject({
  confirmReplace: z.literal(true),
  expectedRevision: revisionSchema,
  ownerId: z.never().optional(),
  schema: z.unknown(),
  title: titleSchema.optional(),
});
const permanentDeleteInputSchema = z.strictObject({
  confirmation: z.literal('PERMANENTLY DELETE'),
});

interface FormRouterDependencies {
  database: AppDatabase;
  now: () => Date;
}

function parseSchema(input: unknown): FormSchema {
  try {
    return parseFormSchema(input);
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      throw new ApiError(400, 'invalid_form_schema', error.message, error.issues);
    }
    throw error;
  }
}

function initialSchema(key: string, title: string): FormSchema {
  return { fields: [], id: key, schemaVersion: 1, title };
}

function safeExportName(key: string, suffix: string): string {
  const safeKey = key.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80) || 'form';
  return `${safeKey}-${suffix}.json`;
}

async function findOwnedForm(
  database: AppDatabase,
  ownerId: string,
  formId: string,
  includeDeleted = false,
) {
  const [form] = await database
    .select()
    .from(forms)
    .where(and(
      eq(forms.id, formId),
      eq(forms.ownerId, ownerId),
      includeDeleted ? undefined : isNull(forms.deletedAt),
    ))
    .limit(1);
  if (form === undefined) {
    throw new ApiError(404, 'form_not_found', 'The form was not found.');
  }
  return form;
}

async function explainFailedDraftUpdate(
  database: AppDatabase,
  ownerId: string,
  formId: string,
): Promise<never> {
  const current = await findOwnedForm(database, ownerId, formId);
  throw new ApiError(
    409,
    'draft_revision_conflict',
    'The draft changed after it was loaded.',
    { currentRevision: current.draftRevision },
  );
}

export function createFormsRouter(dependencies: FormRouterDependencies): Router {
  const router = Router();

  router.get('/', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const deleted = request.query.deleted === 'true';
    const rows = await dependencies.database
      .select({
        createdAt: forms.createdAt,
        currentPublishedVersion: forms.currentPublishedVersion,
        deletedAt: forms.deletedAt,
        draftRevision: forms.draftRevision,
        id: forms.id,
        key: forms.key,
        lastPublishedAt: max(formVersions.publishedAt),
        title: forms.title,
        updatedAt: forms.updatedAt,
      })
      .from(forms)
      .leftJoin(formVersions, eq(formVersions.formId, forms.id))
      .where(and(eq(forms.ownerId, ownerId), deleted ? isNotNull(forms.deletedAt) : isNull(forms.deletedAt)))
      .groupBy(
        forms.createdAt,
        forms.currentPublishedVersion,
        forms.deletedAt,
        forms.draftRevision,
        forms.id,
        forms.key,
        forms.title,
        forms.updatedAt,
      )
      .orderBy(desc(forms.updatedAt));
    response.json({ forms: rows });
  }));

  router.post('/', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const input = createFormInputSchema.parse(request.body);
    const draftSchema = input.schema === undefined
      ? initialSchema(input.key, input.title)
      : parseSchema(input.schema);
    const now = dependencies.now();
    const [form] = await dependencies.database
      .insert(forms)
      .values({
        createdAt: now,
        draftSchema,
        key: input.key,
        ownerId,
        title: input.title,
        updatedAt: now,
      })
      .returning();
    response.status(201).json({ form });
  }));

  router.post('/import', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const input = createFormInputSchema.parse(request.body);
    if (input.schema === undefined) {
      throw new ApiError(400, 'schema_required', 'A schema is required for import.');
    }
    const draftSchema = parseSchema(input.schema);
    const now = dependencies.now();
    const [form] = await dependencies.database
      .insert(forms)
      .values({
        createdAt: now,
        draftSchema,
        key: input.key,
        ownerId,
        title: input.title,
        updatedAt: now,
      })
      .returning();
    response.status(201).json({ form });
  }));

  router.get('/:formId', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    response.json({ form: await findOwnedForm(dependencies.database, ownerId, formId) });
  }));

  const saveDraft = asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    const input = saveDraftInputSchema.parse(request.body);
    const draftSchema = parseSchema(input.schema);
    const now = dependencies.now();
    const [form] = await dependencies.database
      .update(forms)
      .set({
        draftRevision: input.expectedRevision + 1,
        draftSchema,
        ...(input.title === undefined ? {} : { title: input.title }),
        updatedAt: now,
      })
      .where(and(
        eq(forms.id, formId),
        eq(forms.ownerId, ownerId),
        eq(forms.draftRevision, input.expectedRevision),
        isNull(forms.deletedAt),
      ))
      .returning();
    if (form === undefined) {
      await explainFailedDraftUpdate(dependencies.database, ownerId, formId);
    }
    response.json({ form });
  });

  router.put('/:formId/draft', saveDraft);

  router.put('/:formId/import', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    const input = existingImportInputSchema.parse(request.body);
    const draftSchema = parseSchema(input.schema);
    const now = dependencies.now();
    const [form] = await dependencies.database
      .update(forms)
      .set({
        draftRevision: input.expectedRevision + 1,
        draftSchema,
        ...(input.title === undefined ? {} : { title: input.title }),
        updatedAt: now,
      })
      .where(and(
        eq(forms.id, formId),
        eq(forms.ownerId, ownerId),
        eq(forms.draftRevision, input.expectedRevision),
        isNull(forms.deletedAt),
      ))
      .returning();
    if (form === undefined) {
      await explainFailedDraftUpdate(dependencies.database, ownerId, formId);
    }
    response.json({ form });
  }));

  router.post('/:formId/publish', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    const input = publishInputSchema.parse(request.body);
    const now = dependencies.now();

    const result = await dependencies.database.transaction(async (transaction) => {
      const [form] = await transaction
        .select()
        .from(forms)
        .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId), isNull(forms.deletedAt)))
        .for('update')
        .limit(1);
      if (form === undefined) {
        throw new ApiError(404, 'form_not_found', 'The form was not found.');
      }
      if (form.draftRevision !== input.expectedRevision) {
        throw new ApiError(
          409,
          'draft_revision_conflict',
          'The draft changed after it was loaded.',
          { currentRevision: form.draftRevision },
        );
      }

      const schema = parseSchema(form.draftSchema);
      const version = (form.currentPublishedVersion ?? 0) + 1;
      const [publishedVersion] = await transaction
        .insert(formVersions)
        .values({
          createdAt: now,
          formId,
          publishedAt: now,
          publishedBy: ownerId,
          schema,
          schemaVersion: schema.schemaVersion,
          version,
        })
        .returning();
      await transaction
        .update(forms)
        .set({ currentPublishedVersion: version, updatedAt: now })
        .where(eq(forms.id, formId));
      return publishedVersion;
    });

    response.status(201).json({ version: result });
  }));

  router.get('/:formId/versions', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    await findOwnedForm(dependencies.database, ownerId, formId);
    const versions = await dependencies.database
      .select({
        id: formVersions.id,
        publishedAt: formVersions.publishedAt,
        publishedBy: formVersions.publishedBy,
        schemaVersion: formVersions.schemaVersion,
        version: formVersions.version,
      })
      .from(formVersions)
      .where(eq(formVersions.formId, formId))
      .orderBy(desc(formVersions.version));
    response.json({ versions });
  }));

  router.get('/:formId/versions/:version', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    const version = z.coerce.number().int().min(1).parse(request.params.version);
    await findOwnedForm(dependencies.database, ownerId, formId);
    const [publishedVersion] = await dependencies.database
      .select()
      .from(formVersions)
      .where(and(eq(formVersions.formId, formId), eq(formVersions.version, version)))
      .limit(1);
    if (publishedVersion === undefined) {
      throw new ApiError(404, 'version_not_found', 'The published version was not found.');
    }
    response.json({ version: publishedVersion });
  }));

  router.post('/:formId/versions/:version/restore', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    const version = z.coerce.number().int().min(1).parse(request.params.version);
    const input = restoreInputSchema.parse(request.body);
    const now = dependencies.now();

    const [publishedVersion] = await dependencies.database
      .select({ schema: formVersions.schema })
      .from(formVersions)
      .innerJoin(forms, eq(forms.id, formVersions.formId))
      .where(and(
        eq(formVersions.formId, formId),
        eq(formVersions.version, version),
        eq(forms.ownerId, ownerId),
        isNull(forms.deletedAt),
      ))
      .limit(1);
    if (publishedVersion === undefined) {
      throw new ApiError(404, 'version_not_found', 'The published version was not found.');
    }

    const [form] = await dependencies.database
      .update(forms)
      .set({
        draftRevision: input.expectedRevision + 1,
        draftSchema: publishedVersion.schema,
        updatedAt: now,
      })
      .where(and(
        eq(forms.id, formId),
        eq(forms.ownerId, ownerId),
        eq(forms.draftRevision, input.expectedRevision),
        isNull(forms.deletedAt),
      ))
      .returning();
    if (form === undefined) {
      await explainFailedDraftUpdate(dependencies.database, ownerId, formId);
    }
    response.json({ form });
  }));

  router.get('/:formId/export', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    const form = await findOwnedForm(dependencies.database, ownerId, formId);
    const source = z.enum(['draft', 'published']).default('draft').parse(request.query.source);
    let schema: FormSchema;
    let suffix: string;

    if (source === 'draft') {
      schema = parseSchema(form.draftSchema);
      suffix = `draft-r${form.draftRevision}`;
    } else {
      const selectedVersion = request.query.version === undefined
        ? form.currentPublishedVersion
        : z.coerce.number().int().min(1).parse(request.query.version);
      if (selectedVersion === null) {
        throw new ApiError(404, 'version_not_found', 'The form has not been published.');
      }
      const [version] = await dependencies.database
        .select({ schema: formVersions.schema })
        .from(formVersions)
        .where(and(
          eq(formVersions.formId, formId),
          eq(formVersions.version, selectedVersion),
        ))
        .limit(1);
      if (version === undefined) {
        throw new ApiError(404, 'version_not_found', 'The published version was not found.');
      }
      schema = parseSchema(version.schema);
      suffix = `published-v${selectedVersion}`;
    }

    response.setHeader('Content-Disposition', `attachment; filename="${safeExportName(form.key, suffix)}"`);
    response.type('application/json').send(`${JSON.stringify(schema, null, 2)}\n`);
  }));

  router.delete('/:formId', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    const now = dependencies.now();
    const [form] = await dependencies.database
      .update(forms)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId), isNull(forms.deletedAt)))
      .returning();
    if (form === undefined) {
      throw new ApiError(404, 'form_not_found', 'The form was not found.');
    }
    response.json({ form });
  }));

  router.post('/:formId/restore-deleted', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    const now = dependencies.now();
    const [form] = await dependencies.database
      .update(forms)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId), isNotNull(forms.deletedAt)))
      .returning();
    if (form === undefined) {
      throw new ApiError(404, 'form_not_found', 'The deleted form was not found.');
    }
    response.json({ form });
  }));

  router.delete('/:formId/permanent', asyncHandler(async (request, response) => {
    const ownerId = getAuthenticatedUser(response).id;
    const formId = identifierSchema.parse(request.params.formId);
    permanentDeleteInputSchema.parse(request.body);
    const deleted = await dependencies.database.transaction(async (transaction) => {
      const [form] = await transaction
        .select({ id: forms.id })
        .from(forms)
        .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId), isNotNull(forms.deletedAt)))
        .for('update')
        .limit(1);
      if (form === undefined) {
        throw new ApiError(404, 'form_not_found', 'The deleted form was not found.');
      }
      await transaction
        .update(forms)
        .set({ currentPublishedVersion: null })
        .where(eq(forms.id, formId));
      const [removed] = await transaction
        .delete(forms)
        .where(eq(forms.id, formId))
        .returning({ id: forms.id });
      return removed;
    });
    response.json({ deleted });
  }));

  return router;
}
