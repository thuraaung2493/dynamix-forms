import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  bootstrapAdapter,
  createShadcnAdapter,
  DynamicForm,
  type FieldRendererProps,
} from '../src/index.js';
import { schema } from './fixtures.js';

describe('DynamicForm', () => {
  it('renders conditional fields and submits recalculated active values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ ok: true }));
    render(<DynamicForm onSubmit={onSubmit} schema={schema} />);

    expect(screen.queryByLabelText('Detail *')).not.toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name *'), 'Thura');
    await user.selectOptions(screen.getByLabelText('Kind'), '0');
    expect(screen.getByLabelText('Detail *')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Detail *'), 'Nested answer');

    const amount = screen.getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '20');
    expect(screen.getByText('18')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 20,
        detail: 'Nested answer',
        kind: 'detailed',
        name: 'Thura',
        total: 18,
      }),
    );
  });

  it('shows built-in validation errors after a submission attempt', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    render(<DynamicForm onSubmit={onSubmit} schema={schema} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('supports field-specific custom renderers and the fallback adapter', () => {
    function CustomNameRenderer({ field, value }: FieldRendererProps) {
      return <div data-testid="custom-name">{`${field.label}: ${String(value)}`}</div>;
    }

    const { container } = render(
      <DynamicForm
        adapter={bootstrapAdapter}
        customRenderers={{ byName: { name: CustomNameRenderer } }}
        initialData={{ name: 'Custom value' }}
        onSubmit={async () => undefined}
        schema={schema}
      />,
    );

    expect(screen.getByTestId('custom-name')).toHaveTextContent('Name: Custom value');
    expect(container.querySelector('form')).toHaveClass('df-bootstrap');
    expect(createShadcnAdapter(bootstrapAdapter)).toBe(bootstrapAdapter);
  });
});
