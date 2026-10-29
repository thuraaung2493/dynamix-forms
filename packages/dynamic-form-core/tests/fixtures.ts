import type { FormSchema } from '../src/index.js';

export const schema: FormSchema = {
  schemaVersion: 1,
  id: 'assessment',
  title: 'Assessment',
  fields: [
    {
      name: 'applicant_name',
      type: 'text',
      label: 'Applicant name',
      required: true,
      validation: { minLength: 2, maxLength: 100 },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
    },
    {
      name: 'selling_price',
      type: 'number',
      label: 'Selling price',
      defaultValue: 100,
      validation: { min: 0 },
    },
    {
      name: 'expenses',
      type: 'currency',
      label: 'Expenses',
      currencyCode: 'USD',
    },
    {
      name: 'is_registered',
      type: 'checkbox',
      label: 'Registered',
    },
    {
      name: 'services',
      type: 'multiselect',
      label: 'Services',
      options: [
        { label: 'Delivery', value: 'delivery' },
        { label: 'Pickup', value: 'pickup' },
      ],
    },
    {
      name: 'opened_on',
      type: 'date',
      label: 'Opened on',
    },
    {
      name: 'opens_at',
      type: 'time',
      label: 'Opens at',
    },
    {
      name: 'appointment',
      type: 'datetime',
      label: 'Appointment',
    },
    {
      name: 'document',
      type: 'file',
      label: 'Document',
      validation: { accept: ['application/pdf'], maxSizeBytes: 5_000_000 },
    },
    {
      name: 'photo',
      type: 'image',
      label: 'Photo',
      defaultValue: {
        kind: 'remote',
        name: 'existing.png',
        url: 'https://example.com/existing.png',
      },
    },
    {
      name: 'business_type',
      type: 'radio',
      label: 'Business type',
      options: [
        {
          label: 'Agriculture',
          value: 'agriculture',
          fields: [
            {
              name: 'crop_type',
              type: 'select',
              label: 'Crop type',
              options: [
                {
                  label: 'Rice',
                  value: 'rice',
                  fields: [
                    {
                      name: 'field_area',
                      type: 'number',
                      label: 'Field area',
                      defaultValue: 2,
                    },
                  ],
                },
                { label: 'Beans', value: 'beans' },
              ],
            },
          ],
        },
        { label: 'Retail', value: 'retail' },
      ],
    },
    {
      name: 'monthly_profit',
      type: 'calculation',
      label: 'Monthly profit',
      calculation: {
        initialField: 'selling_price',
        steps: [{ operation: 'subtract', field: 'expenses' }],
      },
    },
  ],
};

