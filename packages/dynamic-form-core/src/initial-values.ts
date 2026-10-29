import { evaluateCalculations } from './calculations.js';
import { flattenFields } from './traversal.js';
import type { Field, FormSchema, FormValues } from './types.js';

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (value !== null && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneValue(nestedValue)]),
    );
  }

  return value;
}

function defaultForField(field: Field): unknown {
  if ('defaultValue' in field && field.defaultValue !== undefined) {
    return cloneValue(field.defaultValue);
  }

  switch (field.type) {
    case 'checkbox':
      return false;
    case 'multiselect':
      return [];
    case 'file':
    case 'image':
      return null;
    case 'calculation':
      return null;
    default:
      return '';
  }
}

export function createInitialValues(
  schema: FormSchema,
  initialData: FormValues = {},
): FormValues {
  const values: FormValues = {};

  for (const field of flattenFields(schema)) {
    if (field.type === 'calculation') {
      values[field.name] = null;
      continue;
    }

    values[field.name] = Object.hasOwn(initialData, field.name)
      ? cloneValue(initialData[field.name])
      : defaultForField(field);
  }

  return evaluateCalculations(schema, values).values;
}
