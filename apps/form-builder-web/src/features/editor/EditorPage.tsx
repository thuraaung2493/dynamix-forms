import { parseFormSchema, validateFormSchema, type FieldType, type FormSchema, type FormValues } from '@thuraaung2493/dynamic-form-core';
import { DynamicForm } from '@thuraaung2493/dynamic-form-react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Clock3, Download, Eye, FileClock, Save, Send, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { ApiClientError } from '../../shared/api/client.js';
import { queryClient } from '../../shared/api/queryClient.js';
import { Button } from '../../shared/ui/Button.js';
import { Input } from '../../shared/ui/FormControls.js';
import * as formsApi from '../forms/formsApi.js';
import type { FormRecord } from '../forms/formTypes.js';
import { FieldCanvas } from './FieldCanvas.js';
import { FieldPalette } from './FieldPalette.js';
import { PropertiesPanel } from './PropertiesPanel.js';
import { PreviewMultiselect } from './PreviewMultiselect.js';
import {
  addField,
  duplicateField,
  getBranchTargets,
  moveField,
  removeField,
  sameLocation,
  type ContainerLocation,
  type FieldLocation,
} from './schemaEditor.js';

type EditorMode = 'build' | 'preview' | 'history';

export function EditorPage() {
  const { formId = '' } = useParams();
  const form = useQuery({ queryFn: () => formsApi.getForm(formId), queryKey: ['forms', formId] });
  if (form.isLoading) {
    return <div className="page-state">Loading the editor…</div>;
  }
  if (form.isError || form.data === undefined) {
    return <div className="page-state error-state">This form could not be loaded.</div>;
  }
  return <EditorWorkspace formId={formId} initialForm={form.data} />;
}

function EditorWorkspace({ formId, initialForm }: { formId: string; initialForm: FormRecord }) {
  const navigate = useNavigate();
  const importInput = useRef<HTMLInputElement>(null);
  const [schema, setSchema] = useState<FormSchema>(initialForm.draftSchema);
  const [title, setTitle] = useState(initialForm.title);
  const [baseRevision, setBaseRevision] = useState(initialForm.draftRevision);
  const [currentPublishedVersion, setCurrentPublishedVersion] = useState(initialForm.currentPublishedVersion);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<EditorMode>('build');
  const [selected, setSelected] = useState<FieldLocation>();
  const [activeTargetId, setActiveTargetId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [working, setWorking] = useState(false);
  const [previewResult, setPreviewResult] = useState<FormValues>();
  const versions = useQuery({
    enabled: mode === 'history',
    queryFn: () => formsApi.listVersions(formId),
    queryKey: ['forms', formId, 'versions'],
  });

  function applyRecord(record: FormRecord): void {
    setSchema(record.draftSchema);
    setTitle(record.title);
    setBaseRevision(record.draftRevision);
    setCurrentPublishedVersion(record.currentPublishedVersion);
    setDirty(false);
    queryClient.setQueryData(['forms', formId], record);
    void queryClient.invalidateQueries({ queryKey: ['forms', 'active'] });
  }

  function changeSchema(nextSchema: FormSchema): void {
    setSchema(nextSchema);
    setDirty(true);
    setMessage(undefined);
  }

  function describeError(caught: unknown): string {
    if (caught instanceof ApiClientError && caught.code === 'draft_revision_conflict') {
      return 'This draft changed in another request. Reload before saving so you do not overwrite it.';
    }
    return caught instanceof Error ? caught.message : 'The request could not be completed.';
  }

  async function persistDraft(): Promise<FormRecord | undefined> {
    if (schema === undefined || baseRevision === undefined) return undefined;
    const validation = validateFormSchema(schema);
    if (!validation.valid) {
      const first = validation.issues[0];
      setError(first === undefined ? 'The schema is invalid.' : `${first.path}: ${first.message}`);
      setMode('build');
      return undefined;
    }
    setWorking(true);
    setError(undefined);
    try {
      const record = await formsApi.saveDraft(formId, {
        expectedRevision: baseRevision,
        schema,
        title: title.trim(),
      });
      applyRecord(record);
      setMessage(`Draft revision ${record.draftRevision} saved.`);
      return record;
    } catch (caught) {
      setError(describeError(caught));
      return undefined;
    } finally {
      setWorking(false);
    }
  }

  async function publish(): Promise<void> {
    let revision = baseRevision;
    if (dirty) {
      const saved = await persistDraft();
      if (saved === undefined) return;
      revision = saved.draftRevision;
    }
    if (revision === undefined) return;
    setWorking(true);
    setError(undefined);
    try {
      const published = await formsApi.publishForm(formId, revision);
      setCurrentPublishedVersion(published.version);
      setMessage(`Published version ${published.version}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['forms', formId] }),
        queryClient.invalidateQueries({ queryKey: ['forms', formId, 'versions'] }),
        queryClient.invalidateQueries({ queryKey: ['forms', 'active'] }),
      ]);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setWorking(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined || baseRevision === undefined) return;
    try {
      const imported = parseFormSchema(JSON.parse(await file.text()));
      if (!window.confirm('Replace the current working draft with this validated schema?')) return;
      setWorking(true);
      const record = await formsApi.importDraft(formId, {
        expectedRevision: baseRevision,
        schema: imported,
        ...(imported.title === undefined ? {} : { title: imported.title }),
      });
      applyRecord(record);
      setSelected(undefined);
      setActiveTargetId(undefined);
      setMessage('Imported schema replaced the working draft.');
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setWorking(false);
    }
  }

  async function restore(version: number): Promise<void> {
    if (baseRevision === undefined || !window.confirm(`Restore version ${version} into the working draft? Published history will not change.`)) return;
    setWorking(true);
    try {
      const record = await formsApi.restoreVersion(formId, version, baseRevision);
      applyRecord(record);
      setSelected(undefined);
      setActiveTargetId(undefined);
      setMode('build');
      setMessage(`Version ${version} copied into draft revision ${record.draftRevision}.`);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setWorking(false);
    }
  }

  const validation = validateFormSchema(schema);
  const branchTargets = getBranchTargets(schema);
  const activeTarget = branchTargets.find((target) => target.id === activeTargetId);
  const activeContainer = activeTarget?.location ?? [];

  function chooseContainer(container: ContainerLocation): void {
    setActiveTargetId(branchTargets.find((target) => sameLocation(target.location, container))?.id);
  }

  function insertField(container: ContainerLocation, type: FieldType): void {
    try {
      const result = addField(schema, container, type);
      changeSchema(result.schema);
      setSelected(result.location);
      setError(undefined);
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  return (
    <section className="editor-page">
      <header className="editor-toolbar">
        <div className="editor-title-row">
          <Link aria-label="Back to forms" className="back-link" to="/forms"><ChevronLeft size={19} /></Link>
          <div><Input aria-label="Form title" className="title-input" onChange={(event) => { setTitle(event.target.value); setDirty(true); }} value={title} /><p>{dirty ? 'Unsaved changes' : `Draft revision ${baseRevision}`} · schema v{schema.schemaVersion}</p></div>
        </div>
        <div className="editor-tabs" role="tablist">
          <Button aria-selected={mode === 'build'} onClick={() => setMode('build')} variant={mode === 'build' ? 'default' : 'ghost'}>Build</Button>
          <Button aria-selected={mode === 'preview'} onClick={() => setMode('preview')} variant={mode === 'preview' ? 'default' : 'ghost'}><Eye size={16} /> Preview</Button>
          <Button aria-selected={mode === 'history'} onClick={() => setMode('history')} variant={mode === 'history' ? 'default' : 'ghost'}><Clock3 size={16} /> History</Button>
        </div>
        <div className="button-row">
          <input accept="application/json,.json" className="sr-only" onChange={(event) => void handleImport(event)} ref={importInput} type="file" />
          <Button onClick={() => importInput.current?.click()} size="sm" variant="outline"><Upload size={15} /> Import</Button>
          <Button onClick={() => void formsApi.downloadExport(formId, 'draft')} size="sm" variant="outline"><Download size={15} /> Export</Button>
          <Button disabled={!dirty || working || title.trim().length === 0} onClick={() => void persistDraft()} size="sm" variant="outline"><Save size={15} /> Save</Button>
          <Button disabled={working || title.trim().length === 0 || !validation.valid} onClick={() => void publish()} size="sm"><Send size={15} /> Publish</Button>
        </div>
      </header>

      {message === undefined ? null : <div className="editor-message success-message">{message}</div>}
      {error === undefined ? null : <div className="editor-message form-alert" role="alert">{error}</div>}
      {!validation.valid ? <div className="editor-message warning-message">Schema has {validation.issues.length} issue{validation.issues.length === 1 ? '' : 's'}. Fix them before saving or publishing.</div> : null}

      {mode === 'build' ? (
        <div className="editor-grid">
          <FieldPalette
            onAdd={(type) => insertField(activeContainer, type)}
            schema={schema}
            targetLabel={activeTarget?.label ?? 'Main form'}
          />
          <FieldCanvas
            activeContainer={activeContainer}
            onChooseContainer={(container) => { chooseContainer(container); setSelected(undefined); }}
            onDelete={(location) => { changeSchema(removeField(schema, location)); setSelected(undefined); }}
            onDuplicate={(location) => { const result = duplicateField(schema, location); changeSchema(result.schema); setSelected(result.location); }}
            onMove={(location, direction) => { const result = moveField(schema, location, direction); changeSchema(result.schema); setSelected(result.location); }}
            onSelect={(location) => { setSelected(location); chooseContainer(location.slice(0, -1)); }}
            schema={schema}
            selected={selected}
          />
          <PropertiesPanel location={selected} onChange={changeSchema} schema={schema} />
        </div>
      ) : null}

      {mode === 'preview' ? (
        <div className="preview-layout">
          <div className="preview-card">
            <p className="eyebrow">Live draft</p><h2>{schema.title ?? title}</h2>
            {validation.valid ? <DynamicForm customRenderers={{ byType: { multiselect: PreviewMultiselect } }} onSubmit={async (values) => { setPreviewResult(values); }} schema={schema} submitLabel="Test submission" /> : <div className="page-state error-state">Fix schema issues before previewing.</div>}
          </div>
          <aside className="preview-output"><h3>Submission preview</h3><p>Inactive and disabled values are omitted by default.</p><pre>{previewResult === undefined ? 'Submit the preview to inspect its values.' : JSON.stringify(previewResult, null, 2)}</pre></aside>
        </div>
      ) : null}

      {mode === 'history' ? (
        <div className="history-layout">
          <div className="history-heading"><div><p className="eyebrow">Immutable snapshots</p><h2>Version history</h2></div><FileClock size={28} /></div>
          {versions.data?.length === 0 ? <div className="empty-state"><FileClock size={28} /><h2>Nothing published yet</h2><p>Your first publish will appear here.</p></div> : null}
          <div className="history-list">
            {versions.data?.map((version) => (
              <div className="history-row" key={version.id}>
                <div className="version-number">v{version.version}</div>
                <div><strong>{version.version === currentPublishedVersion ? 'Current published version' : 'Published version'}</strong><p>{new Date(version.publishedAt).toLocaleString()} · schema v{version.schemaVersion}</p></div>
                <div className="button-row"><Button onClick={() => void formsApi.downloadExport(formId, 'published', version.version)} size="sm" variant="outline"><Download size={14} /> Export</Button><Button disabled={working} onClick={() => void restore(version.version)} size="sm" variant="outline">Restore to draft</Button></div>
              </div>
            ))}
          </div>
          <div className="danger-zone"><div><h3>Delete this form</h3><p>Moves the form and all version history to Deleted forms. It is recoverable until permanently removed.</p></div><Button onClick={() => { if (window.confirm('Move this form to Deleted forms?')) void formsApi.softDeleteForm(formId).then(async () => { await queryClient.invalidateQueries({ queryKey: ['forms'] }); navigate('/trash'); }); }} variant="danger"><Trash2 size={16} /> Delete form</Button></div>
        </div>
      ) : null}
    </section>
  );
}
