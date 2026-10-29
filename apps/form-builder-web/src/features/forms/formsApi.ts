import type { FormSchema } from '@thuraaung2493/dynamic-form-core';

import { ApiClientError, apiRequest, apiUrl } from '../../shared/api/client.js';
import type { FormRecord, FormSummary, FormVersion, VersionSummary } from './formTypes.js';

export async function listForms(deleted = false): Promise<FormSummary[]> {
  return (await apiRequest<{ forms: FormSummary[] }>(`/api/forms${deleted ? '?deleted=true' : ''}`)).forms;
}

export async function getForm(id: string): Promise<FormRecord> {
  return (await apiRequest<{ form: FormRecord }>(`/api/forms/${id}`)).form;
}

export async function createForm(input: { key: string; title: string; schema?: FormSchema }): Promise<FormRecord> {
  return (await apiRequest<{ form: FormRecord }>('/api/forms', {
    body: JSON.stringify(input),
    method: 'POST',
  })).form;
}

export async function importNewForm(input: { key: string; title: string; schema: FormSchema }): Promise<FormRecord> {
  return (await apiRequest<{ form: FormRecord }>('/api/forms/import', {
    body: JSON.stringify(input),
    method: 'POST',
  })).form;
}

export async function saveDraft(id: string, input: {
  expectedRevision: number;
  schema: FormSchema;
  title: string;
}): Promise<FormRecord> {
  return (await apiRequest<{ form: FormRecord }>(`/api/forms/${id}/draft`, {
    body: JSON.stringify(input),
    method: 'PUT',
  })).form;
}

export async function importDraft(id: string, input: {
  expectedRevision: number;
  schema: FormSchema;
  title?: string;
}): Promise<FormRecord> {
  return (await apiRequest<{ form: FormRecord }>(`/api/forms/${id}/import`, {
    body: JSON.stringify({ ...input, confirmReplace: true }),
    method: 'PUT',
  })).form;
}

export async function publishForm(id: string, expectedRevision: number): Promise<FormVersion> {
  return (await apiRequest<{ version: FormVersion }>(`/api/forms/${id}/publish`, {
    body: JSON.stringify({ expectedRevision }),
    method: 'POST',
  })).version;
}

export async function listVersions(id: string): Promise<VersionSummary[]> {
  return (await apiRequest<{ versions: VersionSummary[] }>(`/api/forms/${id}/versions`)).versions;
}

export async function restoreVersion(id: string, version: number, expectedRevision: number): Promise<FormRecord> {
  return (await apiRequest<{ form: FormRecord }>(`/api/forms/${id}/versions/${version}/restore`, {
    body: JSON.stringify({ expectedRevision }),
    method: 'POST',
  })).form;
}

export async function softDeleteForm(id: string): Promise<FormRecord> {
  return (await apiRequest<{ form: FormRecord }>(`/api/forms/${id}`, { method: 'DELETE' })).form;
}

export async function restoreDeletedForm(id: string): Promise<FormRecord> {
  return (await apiRequest<{ form: FormRecord }>(`/api/forms/${id}/restore-deleted`, { method: 'POST' })).form;
}

export async function permanentlyDeleteForm(id: string): Promise<void> {
  await apiRequest(`/api/forms/${id}/permanent`, {
    body: JSON.stringify({ confirmation: 'PERMANENTLY DELETE' }),
    method: 'DELETE',
  });
}

export async function downloadExport(id: string, source: 'draft' | 'published', version?: number): Promise<void> {
  const query = new URLSearchParams({ source });
  if (version !== undefined) query.set('version', String(version));
  const response = await fetch(apiUrl(`/api/forms/${id}/export?${query.toString()}`), { credentials: 'include' });
  if (!response.ok) {
    try {
      throw new ApiClientError(response.status, await response.json());
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new Error('Unable to export this form.', { cause: error });
    }
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'form-schema.json';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
