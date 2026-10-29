import { FIELD_TYPES, flattenFields, type FieldType, type FormSchema } from '@thuraaung2493/dynamic-form-core';
import { Calculator, CalendarDays, CheckSquare, FileImage, FormInput, ListChecks } from 'lucide-react';

import { Button } from '../../shared/ui/Button.js';

const labels: Record<FieldType, string> = {
  calculation: 'Calculation', checkbox: 'Checkbox', currency: 'Currency', date: 'Date',
  datetime: 'Date & time', file: 'File', image: 'Image', multiselect: 'Multi-select',
  number: 'Number', radio: 'Radio', select: 'Select', text: 'Text', textarea: 'Long text', time: 'Time',
};

function TypeIcon({ type }: { type: FieldType }) {
  if (type === 'calculation' || type === 'number' || type === 'currency') return <Calculator size={15} />;
  if (type === 'date' || type === 'time' || type === 'datetime') return <CalendarDays size={15} />;
  if (type === 'checkbox' || type === 'select' || type === 'radio' || type === 'multiselect') return <ListChecks size={15} />;
  if (type === 'file' || type === 'image') return <FileImage size={15} />;
  if (type === 'text' || type === 'textarea') return <FormInput size={15} />;
  return <CheckSquare size={15} />;
}

export function FieldTypeChoices({ onAdd, schema }: {
  onAdd: (type: FieldType) => void;
  schema: FormSchema;
}) {
  const hasNumericSource = flattenFields(schema).some((field) =>
    field.type === 'number' || field.type === 'currency' || field.type === 'calculation');
  return (
      <div className="palette-grid">
        {FIELD_TYPES.map((type) => (
          <Button
            disabled={type === 'calculation' && !hasNumericSource}
            key={type}
            onClick={() => onAdd(type)}
            title={type === 'calculation' && !hasNumericSource ? 'Add a number or currency field first.' : undefined}
            variant="outline"
          >
            <TypeIcon type={type} /> {labels[type]}
          </Button>
        ))}
      </div>
  );
}

export function FieldPalette({ onAdd, schema, targetLabel }: {
  onAdd: (type: FieldType) => void;
  schema: FormSchema;
  targetLabel: string;
}) {
  return (
    <aside className="editor-panel palette-panel">
      <div className="panel-heading"><p className="eyebrow">Add field</p><h2>Field palette</h2><p aria-live="polite">Adding to: <strong>{targetLabel}</strong></p></div>
      <FieldTypeChoices onAdd={onAdd} schema={schema} />
    </aside>
  );
}
