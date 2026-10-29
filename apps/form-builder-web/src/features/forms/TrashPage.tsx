import { useMutation, useQuery } from '@tanstack/react-query';
import { ArchiveRestore, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { queryClient } from '../../shared/api/queryClient.js';
import { Button } from '../../shared/ui/Button.js';
import { Card } from '../../shared/ui/Card.js';
import { Input, Label } from '../../shared/ui/FormControls.js';
import * as formsApi from './formsApi.js';

export function TrashPage() {
  const [confirmingId, setConfirmingId] = useState<string>();
  const [confirmation, setConfirmation] = useState('');
  const forms = useQuery({ queryFn: () => formsApi.listForms(true), queryKey: ['forms', 'deleted'] });
  const refresh = async () => queryClient.invalidateQueries({ queryKey: ['forms'] });
  const restore = useMutation({ mutationFn: formsApi.restoreDeletedForm, onSuccess: refresh });
  const remove = useMutation({ mutationFn: formsApi.permanentlyDeleteForm, onSuccess: async () => { setConfirmingId(undefined); setConfirmation(''); await refresh(); } });

  return (
    <section className="page">
      <div className="page-heading"><div><p className="eyebrow">Manual retention</p><h1>Deleted forms</h1><p>Deleted forms stay here until you restore or permanently remove them.</p></div></div>
      {forms.data?.length === 0 ? <div className="empty-state"><Trash2 size={30} /><h2>Trash is empty</h2><p>No form is waiting for permanent deletion.</p></div> : null}
      <div className="stack">
        {forms.data?.map((form) => (
          <Card className="trash-row" key={form.id}>
            <div><h2>{form.title}</h2><p>Deleted {form.deletedAt === null ? '' : new Date(form.deletedAt).toLocaleString()}</p></div>
            <div className="button-row"><Button onClick={() => restore.mutate(form.id)} variant="outline"><ArchiveRestore size={16} /> Restore</Button><Button onClick={() => setConfirmingId(form.id)} variant="danger"><Trash2 size={16} /> Delete permanently</Button></div>
            {confirmingId === form.id ? (
              <div className="confirm-delete">
                <Label htmlFor={`confirm-${form.id}`}>Type PERMANENTLY DELETE</Label>
                <Input id={`confirm-${form.id}`} onChange={(event) => setConfirmation(event.target.value)} value={confirmation} />
                <Button disabled={confirmation !== 'PERMANENTLY DELETE' || remove.isPending} onClick={() => remove.mutate(form.id)} variant="danger">Confirm permanent deletion</Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
