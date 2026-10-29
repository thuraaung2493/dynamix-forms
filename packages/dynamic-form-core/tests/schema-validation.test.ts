import { describe, expect, it } from 'vitest';

import {
  isFormSchema,
  parseFormSchema,
  SchemaValidationError,
  type FormSchema,
  validateFormSchema,
} from '../src/index.js';
import { schema } from './fixtures.js';

describe('schema validation', () => {
  it('accepts a valid recursively nested v1 schema', () => {
    expect(validateFormSchema(schema)).toEqual({ issues: [], valid: true });
    expect(isFormSchema(schema)).toBe(true);
    expect(parseFormSchema(schema)).toBe(schema);
  });

  it('rejects unknown properties instead of discarding them', () => {
    const input = {
      ...schema,
      unsupported: true,
      fields: [
        {
          ...schema.fields[0],
          builderOnlyState: { selected: true },
        },
      ],
    };

    const result = validateFormSchema(input);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-property', path: 'unsupported' }),
        expect.objectContaining({
          code: 'unknown-property',
          path: 'fields[0].builderOnlyState',
        }),
      ]),
    );
  });

  it('detects a duplicated name anywhere in the nested field tree', () => {
    const input = JSON.parse(JSON.stringify(schema)) as FormSchema;
    const businessType = input.fields.find((field) => field.name === 'business_type');
    if (businessType?.type !== 'radio') {
      throw new Error('Fixture is missing the business_type field.');
    }
    businessType.options[0]?.fields?.push({
      name: 'applicant_name',
      type: 'text',
      label: 'Duplicate',
    });

    expect(validateFormSchema(input).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate-field-name',
          fieldName: 'applicant_name',
        }),
      ]),
    );
  });

  it('only permits conditional child fields on select and radio options', () => {
    const input = {
      schemaVersion: 1,
      id: 'invalid-multiselect',
      fields: [
        {
          name: 'choices',
          type: 'multiselect',
          label: 'Choices',
          options: [
            {
              label: 'One',
              value: 'one',
              fields: [{ name: 'nested', type: 'text', label: 'Nested' }],
            },
          ],
        },
      ],
    };

    expect(validateFormSchema(input).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: 'fields[0].options[0].fields',
        }),
      ]),
    );
  });

  it('validates calculation references and their field types', () => {
    const input = {
      schemaVersion: 1,
      id: 'invalid-references',
      fields: [
        { name: 'label', type: 'text', label: 'Label' },
        {
          name: 'total',
          type: 'calculation',
          label: 'Total',
          calculation: {
            initialField: 'missing',
            steps: [{ operation: 'add', field: 'label' }],
          },
        },
      ],
    };

    expect(validateFormSchema(input).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-calculation-reference' }),
        expect.objectContaining({ code: 'invalid-calculation-reference-type' }),
      ]),
    );
  });

  it('detects circular calculation dependencies', () => {
    const input = {
      schemaVersion: 1,
      id: 'cycle',
      fields: [
        {
          name: 'a',
          type: 'calculation',
          label: 'A',
          calculation: { initialField: 'b', steps: [] },
        },
        {
          name: 'b',
          type: 'calculation',
          label: 'B',
          calculation: { initialField: 'a', steps: [] },
        },
      ],
    };

    expect(validateFormSchema(input).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'circular-calculation' })]),
    );
  });

  it('throws a typed error when parsing invalid input', () => {
    let error: unknown;
    try {
      parseFormSchema({ schemaVersion: 2 });
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(SchemaValidationError);
    expect((error as SchemaValidationError).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'id' }),
        expect.objectContaining({ path: 'fields' }),
      ]),
    );
  });

  it('requires choice defaults to match unique declared options', () => {
    const input = {
      schemaVersion: 1,
      id: 'choice-defaults',
      fields: [
        {
          name: 'primary',
          type: 'select',
          label: 'Primary',
          defaultValue: 'missing',
          options: [{ label: 'One', value: 'one' }],
        },
        {
          name: 'many',
          type: 'multiselect',
          label: 'Many',
          defaultValue: ['one', 'one'],
          options: [{ label: 'One', value: 'one' }],
        },
      ],
    };

    expect(validateFormSchema(input).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-value',
          path: 'fields[0].defaultValue',
        }),
        expect.objectContaining({
          code: 'invalid-value',
          path: 'fields[1].defaultValue[1]',
        }),
      ]),
    );
  });
});
