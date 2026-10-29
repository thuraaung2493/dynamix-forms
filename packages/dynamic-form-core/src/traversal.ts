import type { Field, FormSchema, FormValues } from './types.js';

export function flattenFields(schemaOrFields: FormSchema | readonly Field[]): Field[] {
  const fields = Array.isArray(schemaOrFields)
    ? schemaOrFields
    : (schemaOrFields as FormSchema).fields;
  const flattened: Field[] = [];

  const visit = (currentFields: readonly Field[]): void => {
    for (const field of currentFields) {
      flattened.push(field);

      if (field.type === 'select' || field.type === 'radio') {
        for (const option of field.options) {
          if (option.fields) {
            visit(option.fields);
          }
        }
      }
    }
  };

  visit(fields);
  return flattened;
}

export function getActiveFields(schema: FormSchema, values: FormValues): Field[] {
  const active: Field[] = [];

  const visit = (fields: readonly Field[]): void => {
    for (const field of fields) {
      active.push(field);

      if (field.type !== 'select' && field.type !== 'radio') {
        continue;
      }

      const selectedOption = field.options.find(
        (option) => option.value === values[field.name],
      );

      if (selectedOption?.fields) {
        visit(selectedOption.fields);
      }
    }
  };

  visit(schema.fields);
  return active;
}

export function getFieldMap(schema: FormSchema): ReadonlyMap<string, Field> {
  return new Map(flattenFields(schema).map((field) => [field.name, field]));
}

