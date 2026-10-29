import { describe, expect, it } from 'vitest';

import {
  createInitialValues,
  flattenFields,
  getActiveFields,
  prepareSubmission,
} from '../src/index.js';
import { schema } from './fixtures.js';

describe('recursive traversal', () => {
  it('flattens every possible conditional branch', () => {
    expect(flattenFields(schema).map((field) => field.name)).toEqual(
      expect.arrayContaining(['business_type', 'crop_type', 'field_area']),
    );
  });

  it('follows only the currently selected option path', () => {
    const values = createInitialValues(schema, {
      business_type: 'agriculture',
      crop_type: 'rice',
    });

    expect(getActiveFields(schema, values).map((field) => field.name)).toEqual(
      expect.arrayContaining(['business_type', 'crop_type', 'field_area']),
    );

    values.crop_type = 'beans';
    expect(getActiveFields(schema, values).map((field) => field.name)).not.toContain(
      'field_area',
    );
  });
});

describe('submission preparation', () => {
  it('submits active fields by default while preserving hidden values in state', () => {
    const values = createInitialValues(schema, {
      business_type: 'retail',
      crop_type: 'rice',
      field_area: 50,
    });

    const payload = prepareSubmission(schema, values);

    expect(values).toMatchObject({ crop_type: 'rice', field_area: 50 });
    expect(payload).not.toHaveProperty('crop_type');
    expect(payload).not.toHaveProperty('field_area');
  });

  it('can explicitly include inactive values and recalculates before submission', () => {
    const values = createInitialValues(schema, {
      business_type: 'retail',
      crop_type: 'rice',
      expenses: 25,
      field_area: 50,
    });
    values.monthly_profit = -1;

    const payload = prepareSubmission(schema, values, { includeInactive: true });

    expect(payload).toMatchObject({
      crop_type: 'rice',
      field_area: 50,
      monthly_profit: 75,
    });
  });
});

