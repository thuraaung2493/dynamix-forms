import {
  flattenFields,
  type Field,
  type FieldType,
  type FormSchema,
  type RadioField,
  type SelectField,
} from '@thuraaung2493/dynamic-form-core';

export type FieldLocation = number[];
export type ContainerLocation = number[];

export function getBranchTargets(schema: FormSchema): {
  id: string;
  label: string;
  location: ContainerLocation;
}[] {
  const targets: { id: string; label: string; location: ContainerLocation }[] = [];
  function visit(fields: Field[], parent: ContainerLocation, breadcrumb: string[]): void {
    fields.forEach((field, fieldIndex) => {
      if (field.type !== 'select' && field.type !== 'radio') return;
      field.options.forEach((option, optionIndex) => {
        const location = [...parent, fieldIndex, optionIndex];
        const labels = [...breadcrumb, `${field.label} → ${option.label}`];
        targets.push({ id: JSON.stringify([field.name, option.value]), label: labels.join(' / '), location });
        visit(option.fields ?? [], location, labels);
      });
    });
  }
  visit(schema.fields, [], []);
  return targets;
}

type ConditionalField = SelectField | RadioField;

function conditionalField(field: Field): ConditionalField {
  if (field.type !== 'select' && field.type !== 'radio') {
    throw new Error('The field does not contain conditional branches.');
  }
  return field;
}

export function getContainer(schema: FormSchema, location: ContainerLocation): Field[] {
  let fields = schema.fields;
  for (let index = 0; index < location.length; index += 2) {
    const fieldIndex = location[index];
    const optionIndex = location[index + 1];
    if (fieldIndex === undefined || optionIndex === undefined) {
      throw new Error('Invalid container location.');
    }
    const field = fields[fieldIndex];
    if (field === undefined) throw new Error('Field location is out of range.');
    const option = conditionalField(field).options[optionIndex];
    if (option === undefined) throw new Error('Option location is out of range.');
    option.fields ??= [];
    fields = option.fields;
  }
  return fields;
}

export function getField(schema: FormSchema, location: FieldLocation): Field | undefined {
  if (location.length === 0 || location.length % 2 === 0) return undefined;
  const parent = getContainer(schema, location.slice(0, -1));
  return parent[location.at(-1) ?? -1];
}

export function editSchema(schema: FormSchema, edit: (draft: FormSchema) => void): FormSchema {
  const draft = structuredClone(schema);
  edit(draft);
  return draft;
}

function uniqueName(schema: FormSchema, base: string): string {
  const used = new Set(flattenFields(schema).map((field) => field.name));
  let candidate = base;
  let number = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${number}`;
    number += 1;
  }
  return candidate;
}

const labelForType: Record<FieldType, string> = {
  calculation: 'Calculation',
  checkbox: 'Checkbox',
  currency: 'Currency',
  date: 'Date',
  datetime: 'Date and time',
  file: 'File',
  image: 'Image',
  multiselect: 'Multiple choice',
  number: 'Number',
  radio: 'Radio group',
  select: 'Select',
  text: 'Short text',
  textarea: 'Long text',
  time: 'Time',
};

export function createField(schema: FormSchema, type: FieldType): Field {
  const label = labelForType[type];
  const name = uniqueName(schema, type.replace('datetime', 'date_time'));
  const common = { label, name };
  switch (type) {
    case 'text': return { ...common, type };
    case 'textarea': return { ...common, type };
    case 'number': return { ...common, type };
    case 'currency': return { ...common, currencyCode: 'USD', type };
    case 'checkbox': return { ...common, defaultValue: false, type };
    case 'select': return { ...common, options: [{ label: 'Option one', value: 'one' }], type };
    case 'radio': return { ...common, options: [{ label: 'Option one', value: 'one' }], type };
    case 'multiselect': return { ...common, options: [{ label: 'Option one', value: 'one' }], type };
    case 'date': return { ...common, type };
    case 'time': return { ...common, type };
    case 'datetime': return { ...common, type };
    case 'file': return { ...common, type };
    case 'image': return { ...common, type };
    case 'calculation': {
      const source = flattenFields(schema).find((field) =>
        field.type === 'number' || field.type === 'currency' || field.type === 'calculation');
      if (source === undefined) {
        throw new Error('Add a number or currency field before adding a calculation.');
      }
      return { ...common, calculation: { initialField: source.name, steps: [] }, readOnly: true, type };
    }
  }
}

export function addField(schema: FormSchema, container: ContainerLocation, type: FieldType): {
  location: FieldLocation;
  schema: FormSchema;
} {
  let newLocation: FieldLocation = [];
  const next = editSchema(schema, (draft) => {
    const fields = getContainer(draft, container);
    fields.push(createField(draft, type));
    newLocation = [...container, fields.length - 1];
  });
  return { location: newLocation, schema: next };
}

export function removeField(schema: FormSchema, location: FieldLocation): FormSchema {
  return editSchema(schema, (draft) => {
    getContainer(draft, location.slice(0, -1)).splice(location.at(-1) ?? -1, 1);
  });
}

export function moveField(schema: FormSchema, location: FieldLocation, direction: -1 | 1): {
  location: FieldLocation;
  schema: FormSchema;
} {
  const currentIndex = location.at(-1) ?? -1;
  const nextIndex = currentIndex + direction;
  const parentLocation = location.slice(0, -1);
  if (nextIndex < 0) return { location, schema };
  const next = editSchema(schema, (draft) => {
    const fields = getContainer(draft, parentLocation);
    if (nextIndex >= fields.length) return;
    const [field] = fields.splice(currentIndex, 1);
    if (field !== undefined) fields.splice(nextIndex, 0, field);
  });
  return { location: [...parentLocation, nextIndex], schema: next };
}

function renameTree(schema: FormSchema, field: Field): Field {
  const clone = structuredClone(field);
  const renamed = new Map<string, string>();
  const visit = (current: Field): void => {
    const previous = current.name;
    current.name = uniqueName(schema, `${previous}_copy`);
    schema.fields.push(current);
    schema.fields.pop();
    renamed.set(previous, current.name);
    if (current.type === 'select' || current.type === 'radio') {
      current.options.forEach((option) => option.fields?.forEach(visit));
    }
  };
  visit(clone);
  const fixCalculations = (current: Field): void => {
    if (current.type === 'calculation') {
      current.calculation.initialField = renamed.get(current.calculation.initialField) ?? current.calculation.initialField;
      current.calculation.steps.forEach((step) => {
        step.field = renamed.get(step.field) ?? step.field;
      });
    }
    if (current.type === 'select' || current.type === 'radio') {
      current.options.forEach((option) => option.fields?.forEach(fixCalculations));
    }
  };
  fixCalculations(clone);
  return clone;
}

export function duplicateField(schema: FormSchema, location: FieldLocation): {
  location: FieldLocation;
  schema: FormSchema;
} {
  const index = location.at(-1) ?? -1;
  const parentLocation = location.slice(0, -1);
  let nextLocation = location;
  const next = editSchema(schema, (draft) => {
    const fields = getContainer(draft, parentLocation);
    const field = fields[index];
    if (field === undefined) return;
    const duplicate = renameTree(draft, field);
    fields.splice(index + 1, 0, duplicate);
    nextLocation = [...parentLocation, index + 1];
  });
  return { location: nextLocation, schema: next };
}

export function renameField(schema: FormSchema, location: FieldLocation, nextName: string): FormSchema {
  return editSchema(schema, (draft) => {
    const field = getField(draft, location);
    if (field === undefined) return;
    const previousName = field.name;
    field.name = nextName;
    for (const candidate of flattenFields(draft)) {
      if (candidate.type !== 'calculation') continue;
      if (candidate.calculation.initialField === previousName) candidate.calculation.initialField = nextName;
      candidate.calculation.steps.forEach((step) => {
        if (step.field === previousName) step.field = nextName;
      });
    }
  });
}

export function sameLocation(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
