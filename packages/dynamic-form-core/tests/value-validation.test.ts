import { describe, expect, it } from 'vitest';

import {
  createInitialValues,
  prepareSubmission,
  validateFormValues,
  type FormSchema,
} from '../src/index.js';
import { schema } from './fixtures.js';

describe('value validation', () => {
  it('validates only active, enabled fields by default', () => {
    const conditionalSchema: FormSchema = {
      schemaVersion: 1,
      id: 'conditional-validation',
      fields: [
        {
          name: 'choice',
          type: 'select',
          label: 'Choice',
          options: [
            {
              label: 'Show',
              value: 'show',
              fields: [
                { name: 'nested', type: 'text', label: 'Nested', required: true },
              ],
            },
            { label: 'Hide', value: 'hide' },
          ],
        },
        {
          name: 'disabled',
          type: 'text',
          label: 'Disabled',
          required: true,
          disabled: true,
        },
      ],
    };

    expect(validateFormValues(conditionalSchema, { choice: 'hide' }).valid).toBe(true);

    const activeResult = validateFormValues(conditionalSchema, { choice: 'show' });
    expect(activeResult.errors.nested).toEqual(['Nested is required.']);
    expect(activeResult.errors).not.toHaveProperty('disabled');

    const strictResult = validateFormValues(
      conditionalSchema,
      { choice: 'hide' },
      { includeInactive: true, validateDisabled: true },
    );
    expect(strictResult.errors).toMatchObject({
      disabled: ['Disabled is required.'],
      nested: ['Nested is required.'],
    });
  });

  it('validates string, numeric, choice, temporal, and asset constraints', () => {
    const values = createInitialValues(schema, {
      applicant_name: 'A',
      appointment: 'not-a-date',
      document: { name: 'photo.png', size: 9_000_000, type: 'image/png' },
      opened_on: '2026-02-31',
      selling_price: -1,
      services: ['unknown'],
    });

    const result = validateFormValues(schema, values);

    expect(result.errors).toMatchObject({
      applicant_name: [expect.stringContaining('at least 2')],
      appointment: [expect.stringContaining('invalid format')],
      document: [
        expect.stringContaining('maximum file size'),
        expect.stringContaining('unsupported file type'),
      ],
      opened_on: [expect.stringContaining('invalid format')],
      selling_price: [expect.stringContaining('at least 0')],
      services: [expect.stringContaining('invalid selection')],
    });
  });

  it('recalculates values and supports external validation without a dependency', () => {
    const result = validateFormValues(
      schema,
      { applicant_name: 'Moe', expenses: 20, monthly_profit: -1, selling_price: 100 },
      {
        externalValidator: ({ values }) =>
          values.applicant_name === 'Moe'
            ? [
                {
                  code: 'custom',
                  fieldName: 'applicant_name',
                  message: 'This applicant already exists.',
                },
              ]
            : [],
      },
    );

    expect(result.values.monthly_profit).toBe(80);
    expect(result.errors.applicant_name).toEqual(['This applicant already exists.']);
  });

  it('excludes disabled values from submission unless explicitly requested', () => {
    const disabledSchema: FormSchema = {
      schemaVersion: 1,
      id: 'disabled-submission',
      fields: [
        { name: 'normal', type: 'text', label: 'Normal' },
        { name: 'locked', type: 'text', label: 'Locked', disabled: true },
      ],
    };
    const values = { locked: 'server value', normal: 'editable value' };

    expect(prepareSubmission(disabledSchema, values)).toEqual({
      normal: 'editable value',
    });
    expect(
      prepareSubmission(disabledSchema, values, { includeDisabled: true }),
    ).toEqual(values);
  });
});

