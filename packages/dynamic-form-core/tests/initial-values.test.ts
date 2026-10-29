import { describe, expect, it } from 'vitest';

import { createInitialValues } from '../src/index.js';
import { schema } from './fixtures.js';

describe('createInitialValues', () => {
  it('creates defaults for top-level and recursively nested fields', () => {
    expect(createInitialValues(schema)).toEqual({
      applicant_name: '',
      appointment: '',
      business_type: '',
      crop_type: '',
      document: null,
      expenses: '',
      field_area: 2,
      is_registered: false,
      monthly_profit: 100,
      notes: '',
      opened_on: '',
      opens_at: '',
      photo: {
        kind: 'remote',
        name: 'existing.png',
        url: 'https://example.com/existing.png',
      },
      selling_price: 100,
      services: [],
    });
  });

  it('overlays known initial data and recalculates stale derived values', () => {
    const values = createInitialValues(schema, {
      applicant_name: 'Moe',
      expenses: 30,
      monthly_profit: 999_999,
      unknown: 'ignored',
    });

    expect(values.applicant_name).toBe('Moe');
    expect(values.monthly_profit).toBe(70);
    expect(values).not.toHaveProperty('unknown');
  });

  it('does not share mutable defaults with the schema', () => {
    const values = createInitialValues(schema);
    (values.services as string[]).push('delivery');

    const services = schema.fields.find((field) => field.name === 'services');
    expect(services?.type === 'multiselect' ? services.defaultValue : undefined).toBeUndefined();
    expect(createInitialValues(schema).services).toEqual([]);
  });

  it('preserves non-plain browser-owned file-like values', () => {
    class FileLike {
      readonly name = 'new.png';
      readonly size = 100;
      readonly type = 'image/png';
    }

    const file = new FileLike();
    const values = createInitialValues(schema, { photo: file });

    expect(values.photo).toBe(file);
  });
});
