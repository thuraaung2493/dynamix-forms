import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DynamicForm } from '@thuraaung2493/dynamic-form-react';
import { expect, it, vi } from 'vitest';

import { PreviewMultiselect } from './PreviewMultiselect.js';

it.each(['disabled', 'readOnly'] as const)('preserves default chips when a field is %s', async (state) => {
  const interaction = userEvent.setup();
  render(<DynamicForm
    customRenderers={{ byType: { multiselect: PreviewMultiselect } }}
    onSubmit={vi.fn()}
    schema={{ schemaVersion: 1, id: 'test', fields: [{
      name: 'services', label: 'Services', type: 'multiselect', [state]: true,
      defaultValue: ['design'], options: [{ label: 'Design', value: 'design' }],
    }] }}
  />);
  const input = screen.getByRole('combobox', { name: 'Services' });
  expect(screen.getByText('Design')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Show Services options' })).toBeDisabled();
  if (state === 'disabled') {
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Design' })).toHaveAttribute('aria-disabled', 'true');
    await interaction.click(screen.getByRole('button', { name: 'Remove Design' }));
    expect(screen.getByText('Design')).toBeInTheDocument();
  } else {
    expect(input).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Remove Design' })).not.toBeInTheDocument();
    await interaction.click(input);
    await interaction.keyboard('{Backspace}{ArrowDown}{Enter}');
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  }
});
