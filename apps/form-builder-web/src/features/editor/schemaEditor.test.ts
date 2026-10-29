import type { FormSchema } from '@thuraaung2493/dynamic-form-core';
import { describe, expect, it } from 'vitest';

import {
  addField,
  duplicateField,
  getField,
  moveField,
  removeField,
  renameField,
} from './schemaEditor.js';

const conditionalSchema: FormSchema = {
  fields: [{
    label: 'Account type',
    name: 'account_type',
    options: [{ label: 'Business', value: 'business' }],
    type: 'select',
  }],
  id: 'accounts',
  schemaVersion: 1,
};

describe('schema editor operations', () => {
  it('adds, duplicates, moves, and removes fields in recursive branches', () => {
    const nested = addField(conditionalSchema, [0, 0], 'text');
    expect(nested.location).toEqual([0, 0, 0]);
    expect(getField(nested.schema, nested.location)?.type).toBe('text');

    const duplicated = duplicateField(nested.schema, nested.location);
    const firstName = getField(duplicated.schema, [0, 0, 0])?.name;
    const secondName = getField(duplicated.schema, [0, 0, 1])?.name;
    expect(secondName).not.toBe(firstName);

    const moved = moveField(duplicated.schema, [0, 0, 1], -1);
    expect(moved.location).toEqual([0, 0, 0]);
    expect(getField(moved.schema, [0, 0, 0])?.name).toBe(secondName);

    const removed = removeField(moved.schema, [0, 0, 1]);
    const select = removed.fields[0];
    expect(select?.type === 'select' ? select.options[0]?.fields : []).toHaveLength(1);
  });

  it('requires a numeric source before creating calculations', () => {
    expect(() => addField(conditionalSchema, [], 'calculation')).toThrow(/number or currency/i);
    const withNumber = addField(conditionalSchema, [], 'number');
    const withCalculation = addField(withNumber.schema, [], 'calculation');
    const calculation = getField(withCalculation.schema, withCalculation.location);
    expect(calculation?.type === 'calculation' ? calculation.calculation.initialField : '').toBe('number');
  });

  it('updates calculation references when a source field is renamed', () => {
    const schema: FormSchema = {
      fields: [
        { label: 'Amount', name: 'amount', type: 'number' },
        { calculation: { initialField: 'amount', steps: [] }, label: 'Total', name: 'total', type: 'calculation' },
      ],
      id: 'invoice',
      schemaVersion: 1,
    };
    const renamed = renameField(schema, [0], 'gross_amount');
    const calculation = renamed.fields[1];
    expect(calculation?.type === 'calculation' ? calculation.calculation.initialField : '').toBe('gross_amount');
  });
});
