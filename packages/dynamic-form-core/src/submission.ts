import { evaluateCalculations } from './calculations.js';
import { flattenFields, getActiveFields } from './traversal.js';
import type { FormSchema, FormValues } from './types.js';

export interface PrepareSubmissionOptions {
  includeInactive?: boolean;
  includeDisabled?: boolean;
}

export function prepareSubmission(
  schema: FormSchema,
  sourceValues: FormValues,
  options: PrepareSubmissionOptions = {},
): FormValues {
  const calculatedValues = evaluateCalculations(schema, sourceValues).values;
  const fields = options.includeInactive
    ? flattenFields(schema)
    : getActiveFields(schema, calculatedValues);

  return Object.fromEntries(
    fields
      .filter((field) => !field.disabled || options.includeDisabled)
      .map((field) => [field.name, calculatedValues[field.name]]),
  );
}
