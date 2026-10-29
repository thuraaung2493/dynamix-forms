import type { FormSchema } from '@thuraaung2493/dynamic-form-core';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DynamicForm } from '../src/index.js';

const allFieldsSchema: FormSchema = {
  schemaVersion: 1,
  id: 'all-fields',
  fields: [
    { name: 'text', type: 'text', label: 'Text' },
    { name: 'textarea', type: 'textarea', label: 'Textarea' },
    { name: 'number', type: 'number', label: 'Number' },
    { name: 'currency', type: 'currency', label: 'Currency' },
    { name: 'checkbox', type: 'checkbox', label: 'Checkbox' },
    {
      name: 'select',
      type: 'select',
      label: 'Select',
      options: [{ label: 'One', value: 1 }],
    },
    {
      name: 'radio',
      type: 'radio',
      label: 'Radio',
      options: [{ label: 'Radio one', value: 'one' }],
    },
    {
      name: 'multiselect',
      type: 'multiselect',
      label: 'Multiselect',
      options: [
        { label: 'Multi one', value: 'one' },
        { label: 'Multi two', value: 'two' },
      ],
    },
    { name: 'date', type: 'date', label: 'Date' },
    { name: 'time', type: 'time', label: 'Time' },
    { name: 'datetime', type: 'datetime', label: 'Datetime' },
    { name: 'file', type: 'file', label: 'File' },
    { name: 'image', type: 'image', label: 'Image' },
    {
      name: 'calculation',
      type: 'calculation',
      label: 'Calculation',
      calculation: { initialField: 'number', steps: [] },
    },
  ],
};

describe('all v1 field renderers', () => {
  it('renders, edits, previews, and submits every supported value type', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    render(<DynamicForm onSubmit={onSubmit} schema={allFieldsSchema} />);

    await user.type(screen.getByLabelText('Text'), 'value');
    await user.type(screen.getByLabelText('Textarea'), 'long value');
    await user.type(screen.getByLabelText('Number'), '10');
    await user.type(screen.getByLabelText('Currency'), '3.5');
    await user.click(screen.getByLabelText('Checkbox'));
    await user.selectOptions(screen.getByLabelText('Select'), '0');
    await user.click(screen.getByLabelText('Radio one'));
    await user.selectOptions(screen.getByLabelText('Multiselect'), ['0', '1']);
    await user.type(screen.getByLabelText('Date'), '2026-10-26');
    await user.type(screen.getByLabelText('Time'), '09:30');
    await user.type(screen.getByLabelText('Datetime'), '2026-10-26T09:30');

    const document = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });
    const image = new File(['image'], 'image.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('File'), document);
    await user.upload(screen.getByLabelText('Image'), image);
    expect(screen.getByAltText('Selected file preview')).toHaveAttribute(
      'src',
      'blob:preview',
    );

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        calculation: 10,
        checkbox: true,
        currency: 3.5,
        date: '2026-10-26',
        datetime: '2026-10-26T09:30',
        file: document,
        image,
        multiselect: ['one', 'two'],
        number: 10,
        radio: 'one',
        select: 1,
        text: 'value',
        textarea: 'long value',
        time: '09:30',
      }),
    );
  });
});

