import { describe, expect, it } from 'vitest';

import { evaluateCalculations, type FormSchema } from '../src/index.js';
import { schema } from './fixtures.js';

describe('calculation evaluation', () => {
  it('evaluates addition and subtraction from numeric strings and numbers', () => {
    const calculationSchema: FormSchema = {
      schemaVersion: 1,
      id: 'calculation',
      fields: [
        { name: 'income', type: 'number', label: 'Income' },
        { name: 'bonus', type: 'currency', label: 'Bonus' },
        { name: 'expense', type: 'number', label: 'Expense' },
        {
          name: 'net',
          type: 'calculation',
          label: 'Net',
          calculation: {
            initialField: 'income',
            steps: [
              { operation: 'add', field: 'bonus' },
              { operation: 'subtract', field: 'expense' },
            ],
          },
        },
      ],
    };

    expect(
      evaluateCalculations(calculationSchema, {
        bonus: 20,
        expense: 30,
        income: '100',
      }),
    ).toEqual({
      issues: [],
      values: { bonus: 20, expense: 30, income: '100', net: 90 },
    });
  });

  it('treats missing and empty numeric inputs as zero', () => {
    const result = evaluateCalculations(schema, { expenses: '' });

    expect(result.issues).toEqual([]);
    expect(result.values.monthly_profit).toBe(0);
  });

  it('returns a field-specific issue for nonnumeric values', () => {
    const result = evaluateCalculations(schema, {
      expenses: 'not-a-number',
      selling_price: 100,
    });

    expect(result.values.monthly_profit).toBeNull();
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'invalid-number',
        dependency: 'expenses',
        fieldName: 'monthly_profit',
      }),
    ]);
  });

  it('does not recurse forever when called with an invalid circular schema', () => {
    const circularSchema: FormSchema = {
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

    const result = evaluateCalculations(circularSchema, {});

    expect(result.values).toEqual({ a: null, b: null });
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'circular-dependency' })]),
    );
  });

  it('refuses a nonnumeric dependency even when its runtime value looks numeric', () => {
    const invalidSchema: FormSchema = {
      schemaVersion: 1,
      id: 'invalid-runtime-reference',
      fields: [
        { name: 'text', type: 'text', label: 'Text' },
        {
          name: 'total',
          type: 'calculation',
          label: 'Total',
          calculation: { initialField: 'text', steps: [] },
        },
      ],
    };

    const result = evaluateCalculations(invalidSchema, { text: '10' });

    expect(result.values.total).toBeNull();
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'invalid-reference', dependency: 'text' }),
    ]);
  });
});
