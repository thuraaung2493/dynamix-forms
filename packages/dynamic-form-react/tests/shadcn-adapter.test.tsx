import type { FormSchema } from '@thuraaung2493/dynamic-form-core';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  createShadcnAdapter,
  DynamicForm,
  type FieldRendererProps,
  type ShadcnAdapterComponents,
} from '../src/index.js';

const schema: FormSchema = {
  schemaVersion: 1,
  id: 'shadcn-fields',
  fields: [
    { name: 'text', type: 'text', label: 'Text' },
    { name: 'textarea', type: 'textarea', label: 'Textarea' },
    { name: 'number', type: 'number', label: 'Number' },
    { name: 'currency', type: 'currency', label: 'Currency' },
    { name: 'checkbox', type: 'checkbox', label: 'Checkbox' },
    {
      name: 'select', type: 'select', label: 'Select', options: [
        { label: 'One', value: 1, fields: [{ name: 'child', type: 'text', label: 'Child' }] },
      ],
    },
    { name: 'radio', type: 'radio', label: 'Radio', options: [{ label: 'Two', value: 2 }] },
    {
      name: 'multiselect', type: 'multiselect', label: 'Multiselect',
      options: [{ label: 'Three', value: 3 }],
    },
    { name: 'date', type: 'date', label: 'Date' },
    { name: 'time', type: 'time', label: 'Time' },
    { name: 'datetime', type: 'datetime', label: 'Datetime' },
    { name: 'file', type: 'file', label: 'File' },
    { name: 'image', type: 'image', label: 'Image' },
    {
      name: 'calculation', type: 'calculation', label: 'Calculation',
      calculation: { initialField: 'number', steps: [] },
    },
  ],
};

const SelectContext = createContext<{
  disabled: boolean;
  onValueChange: (value: string) => void;
}>({
  disabled: false,
  onValueChange: () => undefined,
});

const RadioContext = createContext<{
  disabled: boolean;
  onValueChange: (value: string) => void;
  value: string;
}>({
  disabled: false,
  onValueChange: () => undefined,
  value: '',
});

const components: ShadcnAdapterComponents = {
  Button: (props: ComponentProps<'button'>) => <button data-ui="button" {...props} />,
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: Omit<ComponentProps<'input'>, 'onChange'> & {
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      data-ui="checkbox"
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
  Input: (props: ComponentProps<'input'>) => <input data-ui="input" {...props} />,
  Label: (props: ComponentProps<'label'>) => <label data-ui="label" {...props} />,
  RadioGroup: ({
    children,
    disabled = false,
    onValueChange,
    value = '',
    ...props
  }: ComponentProps<'div'> & {
    disabled?: boolean;
    onValueChange: (value: string) => void;
    value?: string;
  }) => (
    <RadioContext.Provider value={{ disabled, onValueChange, value }}>
      <div data-ui="radio-group" role="radiogroup" {...props}>{children}</div>
    </RadioContext.Provider>
  ),
  RadioGroupItem: ({ id, value }: { id: string; value: string }) => {
    const group = useContext(RadioContext);
    return (
      <input
        checked={group.value === value}
        data-ui="radio-item"
        disabled={group.disabled}
        id={id}
        onChange={() => group.onValueChange(value)}
        type="radio"
      />
    );
  },
  Select: ({
    children,
    disabled = false,
    items,
    onValueChange,
  }: {
    children: ReactNode;
    disabled?: boolean;
    items?: readonly { label: string; value: string }[];
    onValueChange: (value: string) => void;
  }) => (
    <SelectContext.Provider value={{ disabled, onValueChange }}>
      <div data-ui="select" data-items={items?.length ?? 0}>{children}</div>
    </SelectContext.Provider>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
    const select = useContext(SelectContext);
    return (
      <button
        disabled={select.disabled}
        onClick={() => select.onValueChange(value)}
        type="button"
      >
        {children}
      </button>
    );
  },
  SelectTrigger: (props: ComponentProps<'button'>) => <button type="button" {...props} />,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
  Textarea: (props: ComponentProps<'textarea'>) => <textarea data-ui="textarea" {...props} />,
};

function MultiselectRenderer({ field, value, onBlur, onChange }: FieldRendererProps) {
  if (field.type !== 'multiselect') return null;
  const first = field.options[0];
  return (
    <button
      data-ui="multiselect"
      onClick={() => {
        onChange(first ? [first.value] : []);
        onBlur();
      }}
      type="button"
    >
      {Array.isArray(value) && value.length > 0 ? 'Selected' : 'Choose multiple'}
    </button>
  );
}

describe('component-based shadcn adapter', () => {
  it.each(['base', 'radix'] as const)(
    'renders and submits all field types with %s components',
    async (variant) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(async () => undefined);
      const adapter = createShadcnAdapter({
        components,
        renderers: { multiselect: MultiselectRenderer },
        variant,
      });
      const { container } = render(
        <DynamicForm adapter={adapter} onSubmit={onSubmit} schema={schema} />,
      );

      expect(container.querySelectorAll('[data-ui="input"]')).toHaveLength(8);
      expect(container.querySelector('[data-ui="select"]')).toHaveAttribute(
        'data-items', variant === 'base' ? '1' : '0',
      );
      expect(container.querySelector('[data-ui="multiselect"]')).toBeInTheDocument();
      expect(container.querySelector('select')).not.toBeInTheDocument();

      await user.type(screen.getByLabelText('Text'), 'value');
      await user.type(screen.getByLabelText('Textarea'), 'long value');
      await user.type(screen.getByLabelText('Number'), '10');
      await user.type(screen.getByLabelText('Currency'), '3.5');
      await user.click(screen.getByLabelText('Checkbox'));
      await user.click(screen.getByRole('button', { name: 'One' }));
      await user.type(screen.getByLabelText('Child'), 'nested');
      await user.click(screen.getByLabelText('Two'));
      await user.click(screen.getByRole('button', { name: 'Choose multiple' }));
      await user.type(screen.getByLabelText('Date'), '2026-10-26');
      await user.type(screen.getByLabelText('Time'), '09:30');
      await user.type(screen.getByLabelText('Datetime'), '2026-10-26T09:30');

      const document = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });
      const image = new File(['image'], 'image.png', { type: 'image/png' });
      await user.upload(screen.getByLabelText('File'), document);
      await user.upload(screen.getByLabelText('Image'), image);
      expect(screen.getByAltText('Selected file preview')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        calculation: 10,
        checkbox: true,
        child: 'nested',
        currency: 3.5,
        date: '2026-10-26',
        datetime: '2026-10-26T09:30',
        file: document,
        image,
        multiselect: [3],
        number: 10,
        radio: 2,
        select: 1,
        text: 'value',
        textarea: 'long value',
        time: '09:30',
      }));
    },
  );

  it('connects field errors and help text to the rendered controls', async () => {
    const user = userEvent.setup();
    const adapter = createShadcnAdapter({
      components,
      renderers: { multiselect: MultiselectRenderer },
    });
    const requiredSchema: FormSchema = {
      schemaVersion: 1,
      id: 'required',
      fields: [
        { name: 'name', type: 'text', label: 'Name', required: true },
        {
          name: 'choice', type: 'select', label: 'Choice', required: true,
          helpText: 'Pick one', options: [{ label: 'One', value: 1 }],
        },
      ],
    };
    const { container } = render(
      <DynamicForm adapter={adapter} onSubmit={async () => undefined} schema={requiredSchema} />,
    );

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const name = screen.getByLabelText('Name *');
    const trigger = container.querySelector('[data-field-name="choice"] [id$="choice"]');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name.getAttribute('aria-describedby')).toContain('-errors');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger?.getAttribute('aria-describedby')).toContain('-help');
    expect(trigger?.getAttribute('aria-describedby')).toContain('-errors');
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });
});
