import type { FormSchema } from '@thuraaung2493/dynamic-form-core';
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp('last_used_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp('absolute_expires_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_id_index').on(table.userId),
    index('sessions_expires_at_index').on(table.expiresAt),
  ],
);

export const forms = pgTable(
  'forms',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 120 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    draftSchema: jsonb('draft_schema').$type<FormSchema>().notNull(),
    draftRevision: integer('draft_revision').default(1).notNull(),
    currentPublishedVersion: integer('current_published_version'),
    deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('forms_owner_key_active_unique')
      .on(table.ownerId, table.key)
      .where(sql`${table.deletedAt} is null`),
    index('forms_owner_updated_index').on(table.ownerId, table.updatedAt),
    index('forms_owner_deleted_index').on(table.ownerId, table.deletedAt),
  ],
);

export const formVersions = pgTable(
  'form_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    schemaVersion: integer('schema_version').notNull(),
    schema: jsonb('schema').$type<FormSchema>().notNull(),
    publishedBy: uuid('published_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    publishedAt: timestamp('published_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('form_versions_form_version_unique').on(table.formId, table.version),
    index('form_versions_form_published_index').on(table.formId, table.publishedAt),
  ],
);


export type UserRecord = typeof users.$inferSelect;
export type SessionRecord = typeof sessions.$inferSelect;
export type FormRecord = typeof forms.$inferSelect;
export type FormVersionRecord = typeof formVersions.$inferSelect;

