import {
  SchemaValidationError,
  type SchemaIssue,
  type SchemaValidationResult,
} from './issues.js';
import { FIELD_TYPES, type FieldType, type FormSchema } from './types.js';

type UnknownRecord = Record<string, unknown>;

interface FieldCandidate {
  value: UnknownRecord;
  path: string;
  name: string;
  type: FieldType;
}

const FIELD_TYPE_SET = new Set<string>(FIELD_TYPES);
const COMMON_FIELD_KEYS = new Set([
  'name',
  'type',
  'label',
  'required',
  'disabled',
  'readOnly',
  'helpText',
]);

const TYPE_SPECIFIC_KEYS: Record<FieldType, readonly string[]> = {
  text: ['defaultValue', 'placeholder', 'validation'],
  textarea: ['defaultValue', 'placeholder', 'validation'],
  number: ['defaultValue', 'placeholder', 'validation'],
  currency: ['defaultValue', 'placeholder', 'currencyCode', 'validation'],
  checkbox: ['defaultValue'],
  select: ['defaultValue', 'placeholder', 'options'],
  radio: ['defaultValue', 'options'],
  multiselect: ['defaultValue', 'placeholder', 'options'],
  date: ['defaultValue', 'validation'],
  time: ['defaultValue', 'validation'],
  datetime: ['defaultValue', 'validation'],
  file: ['defaultValue', 'validation'],
  image: ['defaultValue', 'validation'],
  calculation: ['calculation'],
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const propertyPath = (path: string, key: string): string =>
  path ? `${path}.${key}` : key;

export function validateFormSchema(input: unknown): SchemaValidationResult {
  const issues: SchemaIssue[] = [];
  const candidates: FieldCandidate[] = [];

  const addIssue = (
    issue: Omit<SchemaIssue, 'fieldName'>,
    fieldName?: string,
  ): void => {
    issues.push(fieldName === undefined ? issue : { ...issue, fieldName });
  };

  const rejectUnknownKeys = (
    value: UnknownRecord,
    allowedKeys: ReadonlySet<string>,
    path: string,
    fieldName?: string,
  ): void => {
    for (const key of Object.keys(value)) {
      if (!allowedKeys.has(key)) {
        addIssue(
          {
            code: 'unknown-property',
            message: `Property "${key}" is not supported.`,
            path: path ? `${path}.${key}` : key,
          },
          fieldName,
        );
      }
    }
  };

  const requireNonEmptyString = (
    value: UnknownRecord,
    key: string,
    path: string,
    fieldName?: string,
  ): void => {
    if (!(key in value)) {
      addIssue(
        {
          code: 'missing-property',
          message: `Property "${key}" is required.`,
          path: propertyPath(path, key),
        },
        fieldName,
      );
      return;
    }

    if (!isNonEmptyString(value[key])) {
      addIssue(
        {
          code: 'invalid-type',
          message: `Property "${key}" must be a non-empty string.`,
          path: propertyPath(path, key),
        },
        fieldName,
      );
    }
  };

  const validateOptionalString = (
    value: UnknownRecord,
    key: string,
    path: string,
    fieldName?: string,
  ): void => {
    if (key in value && typeof value[key] !== 'string') {
      addIssue(
        {
          code: 'invalid-type',
          message: `Property "${key}" must be a string.`,
          path: propertyPath(path, key),
        },
        fieldName,
      );
    }
  };

  const validateOptionalBoolean = (
    value: UnknownRecord,
    key: string,
    path: string,
    fieldName?: string,
  ): void => {
    if (key in value && typeof value[key] !== 'boolean') {
      addIssue(
        {
          code: 'invalid-type',
          message: `Property "${key}" must be a boolean.`,
          path: propertyPath(path, key),
        },
        fieldName,
      );
    }
  };

  const validateStringRules = (
    inputRules: unknown,
    path: string,
    fieldName: string,
  ): void => {
    if (!isRecord(inputRules)) {
      addIssue(
        {
          code: 'invalid-type',
          message: 'String validation must be an object.',
          path,
        },
        fieldName,
      );
      return;
    }

    rejectUnknownKeys(
      inputRules,
      new Set(['minLength', 'maxLength', 'pattern']),
      path,
      fieldName,
    );

    for (const key of ['minLength', 'maxLength'] as const) {
      const rule = inputRules[key];
      if (rule !== undefined && (!Number.isInteger(rule) || (rule as number) < 0)) {
        addIssue(
          {
            code: 'invalid-value',
            message: `${key} must be a non-negative integer.`,
            path: `${path}.${key}`,
          },
          fieldName,
        );
      }
    }

    if (
      isFiniteNumber(inputRules.minLength) &&
      isFiniteNumber(inputRules.maxLength) &&
      inputRules.minLength > inputRules.maxLength
    ) {
      addIssue(
        {
          code: 'invalid-value',
          message: 'minLength cannot be greater than maxLength.',
          path,
        },
        fieldName,
      );
    }

    if (inputRules.pattern !== undefined) {
      if (typeof inputRules.pattern !== 'string') {
        addIssue(
          {
            code: 'invalid-type',
            message: 'pattern must be a string.',
            path: `${path}.pattern`,
          },
          fieldName,
        );
      } else {
        try {
          new RegExp(inputRules.pattern);
        } catch {
          addIssue(
            {
              code: 'invalid-value',
              message: 'pattern must be a valid regular expression.',
              path: `${path}.pattern`,
            },
            fieldName,
          );
        }
      }
    }
  };

  const validateNumericRules = (
    inputRules: unknown,
    path: string,
    fieldName: string,
  ): void => {
    if (!isRecord(inputRules)) {
      addIssue(
        {
          code: 'invalid-type',
          message: 'Numeric validation must be an object.',
          path,
        },
        fieldName,
      );
      return;
    }

    rejectUnknownKeys(inputRules, new Set(['min', 'max', 'step']), path, fieldName);
    for (const key of ['min', 'max', 'step'] as const) {
      if (inputRules[key] !== undefined && !isFiniteNumber(inputRules[key])) {
        addIssue(
          {
            code: 'invalid-type',
            message: `${key} must be a finite number.`,
            path: `${path}.${key}`,
          },
          fieldName,
        );
      }
    }

    if (isFiniteNumber(inputRules.step) && inputRules.step <= 0) {
      addIssue(
        {
          code: 'invalid-value',
          message: 'step must be greater than zero.',
          path: `${path}.step`,
        },
        fieldName,
      );
    }

    if (
      isFiniteNumber(inputRules.min) &&
      isFiniteNumber(inputRules.max) &&
      inputRules.min > inputRules.max
    ) {
      addIssue(
        {
          code: 'invalid-value',
          message: 'min cannot be greater than max.',
          path,
        },
        fieldName,
      );
    }
  };

  const validateTemporalRules = (
    inputRules: unknown,
    path: string,
    fieldName: string,
  ): void => {
    if (!isRecord(inputRules)) {
      addIssue(
        {
          code: 'invalid-type',
          message: 'Temporal validation must be an object.',
          path,
        },
        fieldName,
      );
      return;
    }

    rejectUnknownKeys(inputRules, new Set(['min', 'max']), path, fieldName);
    validateOptionalString(inputRules, 'min', path, fieldName);
    validateOptionalString(inputRules, 'max', path, fieldName);
  };

  const validateAssetRules = (
    inputRules: unknown,
    path: string,
    fieldName: string,
  ): void => {
    if (!isRecord(inputRules)) {
      addIssue(
        {
          code: 'invalid-type',
          message: 'Asset validation must be an object.',
          path,
        },
        fieldName,
      );
      return;
    }

    rejectUnknownKeys(inputRules, new Set(['accept', 'maxSizeBytes']), path, fieldName);

    if (
      inputRules.accept !== undefined &&
      (!Array.isArray(inputRules.accept) ||
        inputRules.accept.some((entry) => !isNonEmptyString(entry)))
    ) {
      addIssue(
        {
          code: 'invalid-type',
          message: 'accept must be an array of non-empty strings.',
          path: `${path}.accept`,
        },
        fieldName,
      );
    }

    if (
      inputRules.maxSizeBytes !== undefined &&
      (!Number.isInteger(inputRules.maxSizeBytes) ||
        (inputRules.maxSizeBytes as number) <= 0)
    ) {
      addIssue(
        {
          code: 'invalid-value',
          message: 'maxSizeBytes must be a positive integer.',
          path: `${path}.maxSizeBytes`,
        },
        fieldName,
      );
    }
  };

  const validateRemoteAsset = (
    value: unknown,
    path: string,
    fieldName: string,
  ): void => {
    if (value === null) {
      return;
    }

    if (!isRecord(value)) {
      addIssue(
        {
          code: 'invalid-type',
          message: 'An asset default must be null or a remote asset object.',
          path,
        },
        fieldName,
      );
      return;
    }

    rejectUnknownKeys(
      value,
      new Set(['kind', 'url', 'name', 'mimeType', 'size']),
      path,
      fieldName,
    );

    if (value.kind !== 'remote') {
      addIssue(
        {
          code: 'invalid-value',
          message: 'A persisted asset must have kind "remote".',
          path: `${path}.kind`,
        },
        fieldName,
      );
    }
    requireNonEmptyString(value, 'url', path, fieldName);
    validateOptionalString(value, 'name', path, fieldName);
    validateOptionalString(value, 'mimeType', path, fieldName);

    if (value.size !== undefined && (!Number.isInteger(value.size) || (value.size as number) < 0)) {
      addIssue(
        {
          code: 'invalid-value',
          message: 'Asset size must be a non-negative integer.',
          path: `${path}.size`,
        },
        fieldName,
      );
    }
  };

  const validateFields = (inputFields: unknown, path: string): void => {
    if (!Array.isArray(inputFields)) {
      addIssue({
        code: 'invalid-type',
        message: 'fields must be an array.',
        path,
      });
      return;
    }

    inputFields.forEach((field, index) => validateField(field, `${path}[${index}]`));
  };

  const validateOptions = (
    inputOptions: unknown,
    path: string,
    fieldName: string,
    allowNestedFields: boolean,
  ): void => {
    if (!Array.isArray(inputOptions)) {
      addIssue(
        {
          code: 'invalid-type',
          message: 'options must be an array.',
          path,
        },
        fieldName,
      );
      return;
    }

    if (inputOptions.length === 0) {
      addIssue(
        {
          code: 'invalid-value',
          message: 'options must contain at least one option.',
          path,
        },
        fieldName,
      );
    }

    const optionValues = new Map<string, string>();
    inputOptions.forEach((option, optionIndex) => {
      const optionPath = `${path}[${optionIndex}]`;
      if (!isRecord(option)) {
        addIssue(
          {
            code: 'invalid-type',
            message: 'Each option must be an object.',
            path: optionPath,
          },
          fieldName,
        );
        return;
      }

      rejectUnknownKeys(
        option,
        new Set(allowNestedFields ? ['label', 'value', 'fields'] : ['label', 'value']),
        optionPath,
        fieldName,
      );
      requireNonEmptyString(option, 'label', optionPath, fieldName);

      const optionValue = option.value;
      if (
        !(
          isFiniteNumber(optionValue) ||
          (typeof optionValue === 'string' && optionValue.length > 0)
        )
      ) {
        addIssue(
          {
            code: 'invalid-type',
            message: 'Option value must be a non-empty string or finite number.',
            path: `${optionPath}.value`,
          },
          fieldName,
        );
      } else {
        const identity = `${typeof optionValue}:${String(optionValue)}`;
        const existingPath = optionValues.get(identity);
        if (existingPath) {
          addIssue(
            {
              code: 'duplicate-option-value',
              message: `Option value duplicates ${existingPath}.`,
              path: `${optionPath}.value`,
            },
            fieldName,
          );
        } else {
          optionValues.set(identity, `${optionPath}.value`);
        }
      }

      if ('fields' in option) {
        if (allowNestedFields) {
          validateFields(option.fields, `${optionPath}.fields`);
        }
      }
    });
  };

  const validateChoiceDefault = (
    field: UnknownRecord,
    path: string,
    fieldName: string,
    multiple: boolean,
  ): void => {
    if (field.defaultValue === undefined) {
      return;
    }

    const validOptionValues = new Set<string>();
    if (Array.isArray(field.options)) {
      for (const option of field.options) {
        if (!isRecord(option)) {
          continue;
        }
        if (
          isFiniteNumber(option.value) ||
          (typeof option.value === 'string' && option.value.length > 0)
        ) {
          validOptionValues.add(`${typeof option.value}:${String(option.value)}`);
        }
      }
    }

    const validateValue = (value: unknown, valuePath: string): void => {
      if (
        !(
          isFiniteNumber(value) ||
          (typeof value === 'string' && value.length > 0)
        )
      ) {
        addIssue(
          {
            code: 'invalid-type',
            message: 'A choice default must be a non-empty string or finite number.',
            path: valuePath,
          },
          fieldName,
        );
        return;
      }

      if (!validOptionValues.has(`${typeof value}:${String(value)}`)) {
        addIssue(
          {
            code: 'invalid-value',
            message: 'The default value does not match a declared option.',
            path: valuePath,
          },
          fieldName,
        );
      }
    };

    if (multiple) {
      if (!Array.isArray(field.defaultValue)) {
        addIssue(
          {
            code: 'invalid-type',
            message: 'Multiselect defaultValue must be an array.',
            path: `${path}.defaultValue`,
          },
          fieldName,
        );
        return;
      }

      const defaults = new Set<string>();
      field.defaultValue.forEach((value, index) => {
        validateValue(value, `${path}.defaultValue[${index}]`);
        const identity = `${typeof value}:${String(value)}`;
        if (defaults.has(identity)) {
          addIssue(
            {
              code: 'invalid-value',
              message: 'Multiselect default values must be unique.',
              path: `${path}.defaultValue[${index}]`,
            },
            fieldName,
          );
        }
        defaults.add(identity);
      });
      return;
    }

    if (field.defaultValue === '') {
      return;
    }
    validateValue(field.defaultValue, `${path}.defaultValue`);
  };

  const validateCalculation = (
    inputCalculation: unknown,
    path: string,
    fieldName: string,
  ): void => {
    if (!isRecord(inputCalculation)) {
      addIssue(
        {
          code: 'invalid-type',
          message: 'calculation must be an object.',
          path,
        },
        fieldName,
      );
      return;
    }

    rejectUnknownKeys(
      inputCalculation,
      new Set(['initialField', 'steps']),
      path,
      fieldName,
    );
    requireNonEmptyString(inputCalculation, 'initialField', path, fieldName);

    if (!Array.isArray(inputCalculation.steps)) {
      addIssue(
        {
          code: 'invalid-type',
          message: 'Calculation steps must be an array.',
          path: `${path}.steps`,
        },
        fieldName,
      );
      return;
    }

    inputCalculation.steps.forEach((step, index) => {
      const stepPath = `${path}.steps[${index}]`;
      if (!isRecord(step)) {
        addIssue(
          {
            code: 'invalid-type',
            message: 'Each calculation step must be an object.',
            path: stepPath,
          },
          fieldName,
        );
        return;
      }

      rejectUnknownKeys(step, new Set(['operation', 'field']), stepPath, fieldName);
      if (step.operation !== 'add' && step.operation !== 'subtract') {
        addIssue(
          {
            code: 'invalid-value',
            message: 'Calculation operation must be "add" or "subtract".',
            path: `${stepPath}.operation`,
          },
          fieldName,
        );
      }
      requireNonEmptyString(step, 'field', stepPath, fieldName);
    });
  };

  const validateField = (inputField: unknown, path: string): void => {
    if (!isRecord(inputField)) {
      addIssue({
        code: 'invalid-type',
        message: 'Each field must be an object.',
        path,
      });
      return;
    }

    const fieldName = isNonEmptyString(inputField.name) ? inputField.name : undefined;
    const fieldType =
      typeof inputField.type === 'string' && FIELD_TYPE_SET.has(inputField.type)
        ? (inputField.type as FieldType)
        : undefined;

    if (!fieldType) {
      rejectUnknownKeys(inputField, COMMON_FIELD_KEYS, path, fieldName);
      addIssue(
        {
          code: 'unknown-field-type',
          message: 'Field type must be one of the supported v1 field types.',
          path: `${path}.type`,
        },
        fieldName,
      );
    } else {
      rejectUnknownKeys(
        inputField,
        new Set([...COMMON_FIELD_KEYS, ...TYPE_SPECIFIC_KEYS[fieldType]]),
        path,
        fieldName,
      );
    }

    requireNonEmptyString(inputField, 'name', path, fieldName);
    requireNonEmptyString(inputField, 'label', path, fieldName);
    validateOptionalBoolean(inputField, 'required', path, fieldName);
    validateOptionalBoolean(inputField, 'disabled', path, fieldName);
    validateOptionalBoolean(inputField, 'readOnly', path, fieldName);
    validateOptionalString(inputField, 'helpText', path, fieldName);

    if (!fieldType || !fieldName) {
      return;
    }

    candidates.push({ name: fieldName, path, type: fieldType, value: inputField });

    switch (fieldType) {
      case 'text':
      case 'textarea':
        validateOptionalString(inputField, 'defaultValue', path, fieldName);
        validateOptionalString(inputField, 'placeholder', path, fieldName);
        if (inputField.validation !== undefined) {
          validateStringRules(inputField.validation, `${path}.validation`, fieldName);
        }
        break;
      case 'number':
      case 'currency':
        if (
          inputField.defaultValue !== undefined &&
          inputField.defaultValue !== '' &&
          !isFiniteNumber(inputField.defaultValue)
        ) {
          addIssue(
            {
              code: 'invalid-type',
              message: 'Numeric defaultValue must be a finite number or an empty string.',
              path: `${path}.defaultValue`,
            },
            fieldName,
          );
        }
        validateOptionalString(inputField, 'placeholder', path, fieldName);
        if (fieldType === 'currency') {
          validateOptionalString(inputField, 'currencyCode', path, fieldName);
        }
        if (inputField.validation !== undefined) {
          validateNumericRules(inputField.validation, `${path}.validation`, fieldName);
        }
        break;
      case 'checkbox':
        if (inputField.defaultValue !== undefined && typeof inputField.defaultValue !== 'boolean') {
          addIssue(
            {
              code: 'invalid-type',
              message: 'Checkbox defaultValue must be a boolean.',
              path: `${path}.defaultValue`,
            },
            fieldName,
          );
        }
        break;
      case 'select':
      case 'radio':
        validateOptions(inputField.options, `${path}.options`, fieldName, true);
        validateChoiceDefault(inputField, path, fieldName, false);
        if (fieldType === 'select') {
          validateOptionalString(inputField, 'placeholder', path, fieldName);
        }
        break;
      case 'multiselect':
        validateOptions(inputField.options, `${path}.options`, fieldName, false);
        validateChoiceDefault(inputField, path, fieldName, true);
        validateOptionalString(inputField, 'placeholder', path, fieldName);
        break;
      case 'date':
      case 'time':
      case 'datetime':
        validateOptionalString(inputField, 'defaultValue', path, fieldName);
        if (inputField.validation !== undefined) {
          validateTemporalRules(inputField.validation, `${path}.validation`, fieldName);
        }
        break;
      case 'file':
      case 'image':
        if (inputField.defaultValue !== undefined) {
          validateRemoteAsset(inputField.defaultValue, `${path}.defaultValue`, fieldName);
        }
        if (inputField.validation !== undefined) {
          validateAssetRules(inputField.validation, `${path}.validation`, fieldName);
        }
        break;
      case 'calculation':
        validateCalculation(inputField.calculation, `${path}.calculation`, fieldName);
        break;
    }
  };

  if (!isRecord(input)) {
    return {
      valid: false,
      issues: [
        {
          code: 'invalid-type',
          message: 'A form schema must be an object.',
          path: '$',
        },
      ],
    };
  }

  rejectUnknownKeys(input, new Set(['schemaVersion', 'id', 'title', 'fields']), '');

  if (input.schemaVersion !== 1) {
    addIssue({
      code: 'invalid-value',
      message: 'schemaVersion must be 1.',
      path: 'schemaVersion',
    });
  }
  requireNonEmptyString(input, 'id', '');
  validateOptionalString(input, 'title', '');

  if (!('fields' in input)) {
    addIssue({
      code: 'missing-property',
      message: 'Property "fields" is required.',
      path: 'fields',
    });
  } else {
    validateFields(input.fields, 'fields');
  }

  const fieldsByName = new Map<string, FieldCandidate>();
  for (const candidate of candidates) {
    const existing = fieldsByName.get(candidate.name);
    if (existing) {
      addIssue(
        {
          code: 'duplicate-field-name',
          message: `Field name duplicates ${existing.path}.name.`,
          path: `${candidate.path}.name`,
        },
        candidate.name,
      );
    } else {
      fieldsByName.set(candidate.name, candidate);
    }
  }

  const numericFieldTypes = new Set<FieldType>(['number', 'currency', 'calculation']);
  const calculationDependencies = new Map<string, string[]>();

  for (const candidate of candidates) {
    if (candidate.type !== 'calculation' || !isRecord(candidate.value.calculation)) {
      continue;
    }

    const calculation = candidate.value.calculation;
    const references: Array<{ name: string; path: string }> = [];
    if (isNonEmptyString(calculation.initialField)) {
      references.push({
        name: calculation.initialField,
        path: `${candidate.path}.calculation.initialField`,
      });
    }
    if (Array.isArray(calculation.steps)) {
      calculation.steps.forEach((step, index) => {
        if (isRecord(step) && isNonEmptyString(step.field)) {
          references.push({
            name: step.field,
            path: `${candidate.path}.calculation.steps[${index}].field`,
          });
        }
      });
    }

    const calculationReferences: string[] = [];
    for (const reference of references) {
      const referencedField = fieldsByName.get(reference.name);
      if (!referencedField) {
        addIssue(
          {
            code: 'invalid-calculation-reference',
            message: `Calculation references unknown field "${reference.name}".`,
            path: reference.path,
          },
          candidate.name,
        );
      } else if (!numericFieldTypes.has(referencedField.type)) {
        addIssue(
          {
            code: 'invalid-calculation-reference-type',
            message: `Calculation reference "${reference.name}" must target a number, currency, or calculation field.`,
            path: reference.path,
          },
          candidate.name,
        );
      } else if (referencedField.type === 'calculation') {
        calculationReferences.push(reference.name);
      }
    }
    calculationDependencies.set(candidate.name, calculationReferences);
  }

  const visitState = new Map<string, 'visiting' | 'visited'>();
  const cycleReported = new Set<string>();
  const visitCalculation = (name: string, path: string[]): void => {
    if (visitState.get(name) === 'visited') {
      return;
    }

    if (visitState.get(name) === 'visiting') {
      const cycleStart = path.indexOf(name);
      const cycle = [...path.slice(cycleStart), name];
      const cycleKey = [...new Set(cycle)].sort().join('|');
      if (!cycleReported.has(cycleKey)) {
        cycleReported.add(cycleKey);
        const candidate = fieldsByName.get(name);
        addIssue(
          {
            code: 'circular-calculation',
            message: `Circular calculation dependency: ${cycle.join(' -> ')}.`,
            path: `${candidate?.path ?? 'fields'}.calculation`,
          },
          name,
        );
      }
      return;
    }

    visitState.set(name, 'visiting');
    for (const dependency of calculationDependencies.get(name) ?? []) {
      visitCalculation(dependency, [...path, name]);
    }
    visitState.set(name, 'visited');
  };

  for (const calculationName of calculationDependencies.keys()) {
    visitCalculation(calculationName, []);
  }

  return { issues, valid: issues.length === 0 };
}

export function parseFormSchema(input: unknown): FormSchema {
  const result = validateFormSchema(input);
  if (!result.valid) {
    throw new SchemaValidationError(result.issues);
  }
  return input as FormSchema;
}

export function isFormSchema(input: unknown): input is FormSchema {
  return validateFormSchema(input).valid;
}
