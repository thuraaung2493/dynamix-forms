import { flattenFields, type Field, type FormSchema } from '@thuraaung2493/dynamic-form-core';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';

import { Button } from '../../shared/ui/Button.js';
import { Input, Label, Select, Textarea } from '../../shared/ui/FormControls.js';
import { editSchema, getField, renameField, type FieldLocation } from './schemaEditor.js';

function OptionalTextInput({ id, label, value, onChange }: {
  id: string;
  label: string;
  onChange: (value: string | undefined) => void;
  value?: string | undefined;
}) {
  return <div><Label htmlFor={id}>{label}</Label><Input id={id} onChange={(event) => onChange(event.target.value || undefined)} value={value ?? ''} /></div>;
}

export function PropertiesPanel({ schema, location, onChange }: {
  location?: FieldLocation | undefined;
  onChange: (schema: FormSchema) => void;
  schema: FormSchema;
}) {
  const field = location === undefined ? undefined : getField(schema, location);
  if (field === undefined || location === undefined) {
    return <aside className="editor-panel properties-panel"><div className="properties-empty"><SlidersHorizontal size={26} /><h2>Field properties</h2><p>Select a field on the canvas to edit its settings.</p></div></aside>;
  }

  const update = (mutator: (draftField: Field) => void) => {
    onChange(editSchema(schema, (draft) => {
      const selected = getField(draft, location);
      if (selected !== undefined) mutator(selected);
    }));
  };
  const setOptionalString = (key: 'helpText', value: string | undefined) => update((selected) => {
    if (value === undefined) delete selected[key];
    else selected[key] = value;
  });

  const typeProperties = (() => {
    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <>
            <OptionalTextInput id="placeholder" label="Placeholder" value={field.placeholder} onChange={(value) => update((selected) => { if (selected.type === 'text' || selected.type === 'textarea') { if (value === undefined) delete selected.placeholder; else selected.placeholder = value; } })} />
            <OptionalTextInput id="default-string" label="Default value" value={field.defaultValue} onChange={(value) => update((selected) => { if (selected.type === 'text' || selected.type === 'textarea') { if (value === undefined) delete selected.defaultValue; else selected.defaultValue = value; } })} />
            <div className="two-columns">
              <div><Label htmlFor="min-length">Minimum length</Label><Input id="min-length" min="0" onChange={(event) => update((selected) => { if (selected.type === 'text' || selected.type === 'textarea') { const validation = { ...selected.validation }; if (event.target.value === '') delete validation.minLength; else validation.minLength = Number(event.target.value); if (Object.keys(validation).length === 0) delete selected.validation; else selected.validation = validation; } })} type="number" value={field.validation?.minLength ?? ''} /></div>
              <div><Label htmlFor="max-length">Maximum length</Label><Input id="max-length" min="0" onChange={(event) => update((selected) => { if (selected.type === 'text' || selected.type === 'textarea') { const validation = { ...selected.validation }; if (event.target.value === '') delete validation.maxLength; else validation.maxLength = Number(event.target.value); if (Object.keys(validation).length === 0) delete selected.validation; else selected.validation = validation; } })} type="number" value={field.validation?.maxLength ?? ''} /></div>
            </div>
          </>
        );
      case 'number':
      case 'currency':
        return (
          <>
            {field.type === 'currency' ? <OptionalTextInput id="currency-code" label="Currency code" value={field.currencyCode} onChange={(value) => update((selected) => { if (selected.type === 'currency') { if (value === undefined) delete selected.currencyCode; else selected.currencyCode = value.toUpperCase(); } })} /> : null}
            <div className="two-columns">
              <div><Label htmlFor="minimum">Minimum</Label><Input id="minimum" onChange={(event) => update((selected) => { if (selected.type === 'number' || selected.type === 'currency') { const validation = { ...selected.validation }; if (event.target.value === '') delete validation.min; else validation.min = Number(event.target.value); if (Object.keys(validation).length === 0) delete selected.validation; else selected.validation = validation; } })} type="number" value={field.validation?.min ?? ''} /></div>
              <div><Label htmlFor="maximum">Maximum</Label><Input id="maximum" onChange={(event) => update((selected) => { if (selected.type === 'number' || selected.type === 'currency') { const validation = { ...selected.validation }; if (event.target.value === '') delete validation.max; else validation.max = Number(event.target.value); if (Object.keys(validation).length === 0) delete selected.validation; else selected.validation = validation; } })} type="number" value={field.validation?.max ?? ''} /></div>
            </div>
          </>
        );
      case 'checkbox':
        return <label className="check-row"><input checked={field.defaultValue ?? false} onChange={(event) => update((selected) => { if (selected.type === 'checkbox') selected.defaultValue = event.target.checked; })} type="checkbox" /> Checked by default</label>;
      case 'select':
      case 'radio':
      case 'multiselect':
        return (
          <div className="stack compact-stack">
            <Label>Options</Label>
            {field.options.map((option, index) => (
              <div className="option-row" key={index}>
                <Input aria-label={`Option ${index + 1} label`} onChange={(event) => update((selected) => { if (selected.type === 'select' || selected.type === 'radio' || selected.type === 'multiselect') selected.options[index]!.label = event.target.value; })} value={option.label} />
                <Input aria-label={`Option ${index + 1} value`} onChange={(event) => update((selected) => { if (selected.type === 'select' || selected.type === 'radio' || selected.type === 'multiselect') selected.options[index]!.value = event.target.value; })} value={String(option.value)} />
                <Button aria-label={`Remove option ${index + 1}`} disabled={field.options.length === 1} onClick={() => update((selected) => { if (selected.type === 'select' || selected.type === 'radio' || selected.type === 'multiselect') selected.options.splice(index, 1); })} size="icon" variant="ghost"><Trash2 size={14} /></Button>
              </div>
            ))}
            <Button onClick={() => update((selected) => { if (selected.type === 'select' || selected.type === 'radio' || selected.type === 'multiselect') { const count = selected.options.length + 1; selected.options.push({ label: `Option ${count}`, value: `option-${count}` }); } })} size="sm" variant="outline"><Plus size={14} /> Add option</Button>
          </div>
        );
      case 'date':
      case 'time':
      case 'datetime':
        return (
          <div className="two-columns">
            <div><Label htmlFor="temporal-min">Earliest</Label><Input id="temporal-min" onChange={(event) => update((selected) => { if (selected.type === 'date' || selected.type === 'time' || selected.type === 'datetime') { const validation = { ...selected.validation }; if (event.target.value === '') delete validation.min; else validation.min = event.target.value; if (Object.keys(validation).length === 0) delete selected.validation; else selected.validation = validation; } })} value={field.validation?.min ?? ''} /></div>
            <div><Label htmlFor="temporal-max">Latest</Label><Input id="temporal-max" onChange={(event) => update((selected) => { if (selected.type === 'date' || selected.type === 'time' || selected.type === 'datetime') { const validation = { ...selected.validation }; if (event.target.value === '') delete validation.max; else validation.max = event.target.value; if (Object.keys(validation).length === 0) delete selected.validation; else selected.validation = validation; } })} value={field.validation?.max ?? ''} /></div>
          </div>
        );
      case 'file':
      case 'image':
        return (
          <>
            <OptionalTextInput id="accept" label="Accepted MIME types (comma separated)" value={field.validation?.accept?.join(', ')} onChange={(value) => update((selected) => { if (selected.type === 'file' || selected.type === 'image') { const validation = { ...selected.validation }; if (value === undefined) delete validation.accept; else validation.accept = value.split(',').map((item) => item.trim()).filter(Boolean); if (Object.keys(validation).length === 0) delete selected.validation; else selected.validation = validation; } })} />
            <div><Label htmlFor="max-size">Maximum size (MB)</Label><Input id="max-size" min="0" onChange={(event) => update((selected) => { if (selected.type === 'file' || selected.type === 'image') { const validation = { ...selected.validation }; if (event.target.value === '') delete validation.maxSizeBytes; else validation.maxSizeBytes = Number(event.target.value) * 1_000_000; if (Object.keys(validation).length === 0) delete selected.validation; else selected.validation = validation; } })} type="number" value={field.validation?.maxSizeBytes === undefined ? '' : field.validation.maxSizeBytes / 1_000_000} /></div>
          </>
        );
      case 'calculation': {
        const numericFields = flattenFields(schema).filter((candidate) =>
          candidate.name !== field.name && (candidate.type === 'number' || candidate.type === 'currency' || candidate.type === 'calculation'));
        return (
          <div className="stack compact-stack">
            <div><Label htmlFor="initial-field">Start with</Label><Select id="initial-field" onChange={(event) => update((selected) => { if (selected.type === 'calculation') selected.calculation.initialField = event.target.value; })} value={field.calculation.initialField}>{numericFields.map((candidate) => <option key={candidate.name} value={candidate.name}>{candidate.label} ({candidate.name})</option>)}</Select></div>
            <Label>Steps</Label>
            {field.calculation.steps.map((step, index) => (
              <div className="calculation-step" key={index}>
                <Select aria-label={`Step ${index + 1} operation`} onChange={(event) => update((selected) => { if (selected.type === 'calculation') selected.calculation.steps[index]!.operation = event.target.value as 'add' | 'subtract'; })} value={step.operation}><option value="add">Add</option><option value="subtract">Subtract</option></Select>
                <Select aria-label={`Step ${index + 1} field`} onChange={(event) => update((selected) => { if (selected.type === 'calculation') selected.calculation.steps[index]!.field = event.target.value; })} value={step.field}>{numericFields.map((candidate) => <option key={candidate.name} value={candidate.name}>{candidate.label}</option>)}</Select>
                <Button aria-label={`Remove calculation step ${index + 1}`} onClick={() => update((selected) => { if (selected.type === 'calculation') selected.calculation.steps.splice(index, 1); })} size="icon" variant="ghost"><Trash2 size={14} /></Button>
              </div>
            ))}
            <Button disabled={numericFields.length === 0} onClick={() => update((selected) => { if (selected.type === 'calculation' && numericFields[0] !== undefined) selected.calculation.steps.push({ field: numericFields[0].name, operation: 'add' }); })} size="sm" variant="outline"><Plus size={14} /> Add step</Button>
          </div>
        );
      }
    }
  })();

  return (
    <aside className="editor-panel properties-panel">
      <div className="panel-heading"><p className="eyebrow">Configure</p><h2>{field.type} field</h2></div>
      <div className="properties-form">
        <div><Label htmlFor="field-label">Label</Label><Input id="field-label" onChange={(event) => update((selected) => { selected.label = event.target.value; })} value={field.label} /></div>
        <div><Label htmlFor="field-name">Name</Label><Input id="field-name" onChange={(event) => onChange(renameField(schema, location, event.target.value))} value={field.name} /><p className="field-hint">Unique across the entire nested schema.</p></div>
        <div><Label htmlFor="help-text">Help text</Label><Textarea id="help-text" onChange={(event) => setOptionalString('helpText', event.target.value || undefined)} rows={2} value={field.helpText ?? ''} /></div>
        <div className="check-grid">
          <label className="check-row"><input checked={field.required ?? false} onChange={(event) => update((selected) => { selected.required = event.target.checked; })} type="checkbox" /> Required</label>
          <label className="check-row"><input checked={field.disabled ?? false} onChange={(event) => update((selected) => { selected.disabled = event.target.checked; })} type="checkbox" /> Disabled</label>
          <label className="check-row"><input checked={field.readOnly ?? false} disabled={field.type === 'calculation'} onChange={(event) => update((selected) => { selected.readOnly = event.target.checked; })} type="checkbox" /> Read only</label>
        </div>
        {typeProperties}
      </div>
    </aside>
  );
}
