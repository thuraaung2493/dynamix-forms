import { parseFormSchema } from '@thuraaung2493/dynamic-form-core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileJson, FilePlus2, History, MoreHorizontal, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { queryClient } from '../../shared/api/queryClient.js';
import { Button } from '../../shared/ui/Button.js';
import { Card } from '../../shared/ui/Card.js';
import { Input, Label } from '../../shared/ui/FormControls.js';
import * as formsApi from './formsApi.js';

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string>();
  const forms = useQuery({ queryFn: () => formsApi.listForms(false), queryKey: ['forms', 'active'] });
  const create = useMutation({
    mutationFn: formsApi.createForm,
    onSuccess: async (form) => {
      await queryClient.invalidateQueries({ queryKey: ['forms'] });
      navigate(`/forms/${form.id}/edit`);
    },
  });
  const importForm = useMutation({
    mutationFn: formsApi.importNewForm,
    onSuccess: async (form) => {
      await queryClient.invalidateQueries({ queryKey: ['forms'] });
      navigate(`/forms/${form.id}/edit`);
    },
  });

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    setError(undefined);
    try {
      const schema = parseFormSchema(JSON.parse(await file.text()));
      const importedTitle = schema.title?.trim() || file.name.replace(/\.json$/i, '') || 'Imported form';
      await importForm.mutateAsync({
        key: slugify(schema.id) || `import-${Date.now()}`,
        schema,
        title: importedTitle,
      });
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'The selected JSON file is invalid.');
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div><p className="eyebrow">Private workspace</p><h1>Your forms</h1><p>Build drafts freely. Publish only when the schema is ready.</p></div>
        <div className="button-row">
          <input accept="application/json,.json" className="sr-only" onChange={(event) => void handleImport(event)} ref={fileInput} type="file" />
          <Button onClick={() => fileInput.current?.click()} variant="outline"><Upload size={17} /> Import JSON</Button>
          <Button onClick={() => setCreating(true)}><FilePlus2 size={17} /> Create form</Button>
        </div>
      </div>

      {creating ? (
        <Card className="create-panel">
          <div><Label htmlFor="new-title">Form title</Label><Input autoFocus id="new-title" onChange={(event) => setTitle(event.target.value)} placeholder="Customer intake" value={title} /></div>
          <div className="button-row"><Button onClick={() => setCreating(false)} variant="ghost">Cancel</Button><Button disabled={title.trim().length === 0 || create.isPending} onClick={() => create.mutate({ key: slugify(title) || `form-${Date.now()}`, title: title.trim() })}>{create.isPending ? 'Creating…' : 'Create and edit'}</Button></div>
        </Card>
      ) : null}

      {error === undefined ? null : <p className="form-alert" role="alert">{error}</p>}
      {forms.isLoading ? <div className="page-state">Loading forms…</div> : null}
      {forms.isError ? <div className="page-state error-state">Unable to load your forms.</div> : null}
      {forms.data?.length === 0 ? (
        <div className="empty-state"><FileJson size={32} /><h2>No forms yet</h2><p>Create a blank form or import a validated Dynamix schema.</p></div>
      ) : (
        <div className="form-grid">
          {forms.data?.map((form) => (
            <Card className="form-card" key={form.id}>
              <div className="form-card-top"><span className="schema-pill">{form.key}</span><MoreHorizontal size={18} /></div>
              <h2><Link to={`/forms/${form.id}/edit`}>{form.title}</Link></h2>
              <p>Draft revision {form.draftRevision}</p>
              <div className="form-meta"><span><History size={14} /> {form.currentPublishedVersion === null ? 'Not published' : `Published v${form.currentPublishedVersion}`}</span><time dateTime={form.updatedAt}>Updated {new Date(form.updatedAt).toLocaleDateString()}</time></div>
              <Button onClick={() => navigate(`/forms/${form.id}/edit`)} variant="outline">Open editor</Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
