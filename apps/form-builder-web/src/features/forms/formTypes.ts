import type { FormSchema } from '@thuraaung2493/dynamic-form-core';

export interface FormSummary {
  createdAt: string;
  currentPublishedVersion: number | null;
  deletedAt: string | null;
  draftRevision: number;
  id: string;
  key: string;
  lastPublishedAt?: string | null;
  title: string;
  updatedAt: string;
}

export interface FormRecord extends FormSummary {
  draftSchema: FormSchema;
  ownerId: string;
}

export interface VersionSummary {
  id: string;
  publishedAt: string;
  publishedBy: string;
  schemaVersion: number;
  version: number;
}

export interface FormVersion extends VersionSummary {
  createdAt: string;
  formId: string;
  schema: FormSchema;
}
