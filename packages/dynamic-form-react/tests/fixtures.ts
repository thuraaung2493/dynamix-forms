import type { FormSchema } from '@thuraaung2493/dynamic-form-core';

export const schema: FormSchema = {
  schemaVersion: 1,
  id: 'react-test',
  title: 'React test form',
  fields: [
    { name: 'name', type: 'text', label: 'Name', required: true },
    {
      name: 'kind',
      type: 'select',
      label: 'Kind',
      options: [
        {
          label: 'Detailed',
          value: 'detailed',
          fields: [
            { name: 'detail', type: 'text', label: 'Detail', required: true },
          ],
        },
        { label: 'Simple', value: 'simple' },
      ],
    },
    { name: 'amount', type: 'number', label: 'Amount', defaultValue: 10 },
    { name: 'fee', type: 'number', label: 'Fee', defaultValue: 2 },
    {
      name: 'total',
      type: 'calculation',
      label: 'Total',
      calculation: {
        initialField: 'amount',
        steps: [{ operation: 'subtract', field: 'fee' }],
      },
    },
  ],
};

