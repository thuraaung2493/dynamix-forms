import { evaluateCalculations } from './calculations.js';
import { flattenFields, getActiveFields } from './traversal.js';
import type {
  Field,
  FormSchema,
  FormValues,
  OptionValue,
} from './types.js';

export type ValueIssueCode =
  | 'calculation'
  | 'custom'
  | 'file-accept'
  | 'file-size'
  | 'invalid-format'
  | 'invalid-option'
  | 'invalid-type'
  | 'max'
  | 'max-length'
  | 'min'
  | 'min-length'
  | 'pattern'
  | 'required'
  | 'step';

export interface ValueValidationIssue {
  code: ValueIssueCode;
  fieldName: string;
  message: string;
}

export interface ValueValidationContext {
  schema: FormSchema;
  values: FormValues;
  fields: readonly Field[];
}

export type ExternalValueValidator = (
  context: ValueValidationContext,
) => readonly ValueValidationIssue[];

export interface ValueValidationOptions {
  includeInactive?: boolean;
  validateDisabled?: boolean;
  externalValidator?: ExternalValueValidator;
}

export interface ValueValidationResult {
  valid: boolean;
  values: FormValues;
  issues: ValueValidationIssue[];
  errors: Record<string, string[]>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  value === false ||
  (Array.isArray(value) && value.length === 0);

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const isOptionValue = (value: unknown): value is OptionValue =>
  (typeof value === 'string' && value.length > 0) ||
  (typeof value === 'number' && Number.isFinite(value));

const optionExists = (
  options: readonly { value: OptionValue }[],
  value: unknown,
): boolean => options.some((option) => option.value === value);

const isValidDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const isValidTime = (value: string): boolean =>
  /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);

const isValidDatetime = (value: string): boolean => {
  const [date, time, extra] = value.split('T');
  return extra === undefined && date !== undefined && time !== undefined
    ? isValidDate(date) && isValidTime(time)
    : false;
};

const isRemoteAsset = (value: unknown): boolean =>
  isRecord(value) && value.kind === 'remote' && typeof value.url === 'string';

const isLocalFile = (
  value: unknown,
): value is { name: string; size: number; type: string } =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  typeof value.size === 'number' &&
  typeof value.type === 'string';

const acceptedFile = (
  file: { name: string; type: string },
  accept: readonly string[],
): boolean =>
  accept.some((rule) => {
    if (rule.startsWith('.')) {
      return file.name.toLowerCase().endsWith(rule.toLowerCase());
    }
    if (rule.endsWith('/*')) {
      return file.type.startsWith(rule.slice(0, -1));
    }
    return file.type === rule;
  });

export function validateFormValues(
  schema: FormSchema,
  sourceValues: FormValues,
  options: ValueValidationOptions = {},
): ValueValidationResult {
  const calculationResult = evaluateCalculations(schema, sourceValues);
  const values = calculationResult.values;
  const fields = options.includeInactive
    ? flattenFields(schema)
    : getActiveFields(schema, values);
  const includedFieldNames = new Set(fields.map((field) => field.name));
  const issues: ValueValidationIssue[] = [];

  const addIssue = (
    fieldName: string,
    code: ValueIssueCode,
    message: string,
  ): void => {
    issues.push({ code, fieldName, message });
  };

  for (const calculationIssue of calculationResult.issues) {
    if (includedFieldNames.has(calculationIssue.fieldName)) {
      addIssue(calculationIssue.fieldName, 'calculation', calculationIssue.message);
    }
  }

  for (const field of fields) {
    if (field.disabled && !options.validateDisabled) {
      continue;
    }

    const value = values[field.name];
    if (field.required && isEmpty(value)) {
      addIssue(field.name, 'required', `${field.label} is required.`);
      continue;
    }
    if (isEmpty(value)) {
      continue;
    }

    switch (field.type) {
      case 'text':
      case 'textarea': {
        if (typeof value !== 'string') {
          addIssue(field.name, 'invalid-type', `${field.label} must be text.`);
          break;
        }
        const rules = field.validation;
        if (rules?.minLength !== undefined && value.length < rules.minLength) {
          addIssue(
            field.name,
            'min-length',
            `${field.label} must contain at least ${rules.minLength} characters.`,
          );
        }
        if (rules?.maxLength !== undefined && value.length > rules.maxLength) {
          addIssue(
            field.name,
            'max-length',
            `${field.label} must contain no more than ${rules.maxLength} characters.`,
          );
        }
        if (rules?.pattern !== undefined && !new RegExp(rules.pattern).test(value)) {
          addIssue(field.name, 'pattern', `${field.label} has an invalid format.`);
        }
        break;
      }
      case 'number':
      case 'currency': {
        const number = toNumber(value);
        if (number === undefined) {
          addIssue(field.name, 'invalid-type', `${field.label} must be a number.`);
          break;
        }
        const rules = field.validation;
        if (rules?.min !== undefined && number < rules.min) {
          addIssue(field.name, 'min', `${field.label} must be at least ${rules.min}.`);
        }
        if (rules?.max !== undefined && number > rules.max) {
          addIssue(field.name, 'max', `${field.label} must be at most ${rules.max}.`);
        }
        if (rules?.step !== undefined) {
          const base = rules.min ?? 0;
          const steps = (number - base) / rules.step;
          if (Math.abs(steps - Math.round(steps)) > 1e-9) {
            addIssue(field.name, 'step', `${field.label} must use increments of ${rules.step}.`);
          }
        }
        break;
      }
      case 'checkbox':
        if (typeof value !== 'boolean') {
          addIssue(field.name, 'invalid-type', `${field.label} must be true or false.`);
        }
        break;
      case 'select':
      case 'radio':
        if (!isOptionValue(value) || !optionExists(field.options, value)) {
          addIssue(field.name, 'invalid-option', `${field.label} has an invalid selection.`);
        }
        break;
      case 'multiselect':
        if (
          !Array.isArray(value) ||
          value.some((entry) => !isOptionValue(entry) || !optionExists(field.options, entry))
        ) {
          addIssue(field.name, 'invalid-option', `${field.label} has an invalid selection.`);
        }
        break;
      case 'date':
      case 'time':
      case 'datetime': {
        const valid =
          typeof value === 'string' &&
          (field.type === 'date'
            ? isValidDate(value)
            : field.type === 'time'
              ? isValidTime(value)
              : isValidDatetime(value));
        if (!valid) {
          addIssue(field.name, 'invalid-format', `${field.label} has an invalid format.`);
          break;
        }
        if (field.validation?.min !== undefined && value < field.validation.min) {
          addIssue(field.name, 'min', `${field.label} must not be before ${field.validation.min}.`);
        }
        if (field.validation?.max !== undefined && value > field.validation.max) {
          addIssue(field.name, 'max', `${field.label} must not be after ${field.validation.max}.`);
        }
        break;
      }
      case 'file':
      case 'image': {
        if (!isRemoteAsset(value) && !isLocalFile(value)) {
          addIssue(field.name, 'invalid-type', `${field.label} must be a file.`);
          break;
        }
        const file = isLocalFile(value) ? value : undefined;
        if (
          file &&
          field.validation?.maxSizeBytes !== undefined &&
          file.size > field.validation.maxSizeBytes
        ) {
          addIssue(
            field.name,
            'file-size',
            `${field.label} exceeds the maximum file size.`,
          );
        }
        if (
          file &&
          field.validation?.accept !== undefined &&
          !acceptedFile(file, field.validation.accept)
        ) {
          addIssue(field.name, 'file-accept', `${field.label} has an unsupported file type.`);
        }
        break;
      }
      case 'calculation':
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          addIssue(field.name, 'invalid-type', `${field.label} could not be calculated.`);
        }
        break;
    }
  }

  if (options.externalValidator) {
    issues.push(...options.externalValidator({ fields, schema, values }));
  }

  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    (errors[issue.fieldName] ??= []).push(issue.message);
  }

  return { errors, issues, valid: issues.length === 0, values };
}

