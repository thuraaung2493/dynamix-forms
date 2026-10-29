import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';

import { queryClient } from '../../shared/api/queryClient.js';
import * as formsApi from '../forms/formsApi.js';
import type { FormRecord } from '../forms/formTypes.js';
import { EditorPage } from './EditorPage.js';

vi.mock('../forms/formsApi.js', () => ({ getForm: vi.fn(), saveDraft: vi.fn(), listVersions: vi.fn() }));

const initialForm: FormRecord = {
  id: 'test-form', ownerId: 'owner', key: 'intake', title: 'Intake',
  createdAt: '2026-10-26T00:00:00Z', updatedAt: '2026-10-26T00:00:00Z',
  deletedAt: null, currentPublishedVersion: null, draftRevision: 1,
  draftSchema: {
    schemaVersion: 1, id: 'intake', fields: [{
      name: 'customer', label: 'Customer', type: 'select', options: [
        { label: 'Personal', value: 'personal' },
        { label: 'Business', value: 'business' },
      ],
    }],
  },
};

beforeEach(() => {
  queryClient.clear();
  vi.mocked(formsApi.getForm).mockResolvedValue(structuredClone(initialForm));
  vi.mocked(formsApi.saveDraft).mockImplementation(async (_id, input) => ({
    ...initialForm, draftSchema: input.schema, draftRevision: 2,
  }));
});

it('adds sidebar fields to the clicked condition and returns to the main form when deselected', async () => {
  const interaction = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/forms/test-form/edit']}>
        <Routes><Route path="/forms/:formId/edit" element={<EditorPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  await interaction.click(await screen.findByRole('button', { name: 'Customer → Business' }));
  const palette = screen.getByRole('heading', { name: 'Field palette' }).closest('aside');
  if (palette === null) throw new Error('Field palette missing');
  expect(within(palette).getByText('Customer → Business', { exact: true })).toBeInTheDocument();
  await interaction.click(within(palette).getByRole('button', { name: 'Radio' }));

  const condition = screen.getByRole('button', { name: 'Radio group → Option one' });
  // Native condition buttons also support keyboard selection.
  condition.focus();
  await interaction.keyboard('{Enter}');
  expect(condition).toHaveAttribute('aria-pressed', 'true');
  await interaction.click(within(palette).getByRole('button', { name: 'Text' }));
  await interaction.click(within(palette).getByRole('button', { name: 'Checkbox' }));
  expect(screen.getByRole('button', { name: 'Radio group → Option one' })).toHaveAttribute('aria-pressed', 'true');

  await interaction.click(screen.getByRole('button', { name: 'Radio group → Option one' }));
  expect(within(palette).getByText('Main form')).toBeInTheDocument();
  await interaction.click(within(palette).getByRole('button', { name: 'Number' }));
  expect(screen.queryByLabelText('Add fields to')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /add field/i })).not.toBeInTheDocument();

  await interaction.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByText('Draft revision 2 saved.');
  expect(formsApi.saveDraft).toHaveBeenCalledWith('test-form', expect.objectContaining({
    schema: expect.objectContaining({ fields: [
      expect.objectContaining({ type: 'select', options: [
        { label: 'Personal', value: 'personal' },
        expect.objectContaining({ value: 'business', fields: [
          expect.objectContaining({ type: 'radio', options: [
            expect.objectContaining({ fields: [expect.objectContaining({ type: 'text' }), expect.objectContaining({ type: 'checkbox' })] }),
          ] }),
        ] }),
      ] }),
      expect.objectContaining({ type: 'number' }),
    ] }),
  }));
});

it('previews a searchable multiselect with removable chips and preserves option value types', async () => {
  vi.mocked(formsApi.getForm).mockResolvedValue({
    ...initialForm,
    draftSchema: {
      schemaVersion: 1, id: 'intake', fields: [{
        name: 'services', label: 'Services', type: 'multiselect', required: true,
        options: [
          { label: 'Design', value: '1' },
          { label: 'Development', value: 1 },
          { label: 'Support', value: 'support' },
        ],
      }],
    },
  });
  const interaction = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/forms/test-form/edit']}>
        <Routes><Route path="/forms/:formId/edit" element={<EditorPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await interaction.click(await screen.findByRole('button', { name: 'Preview' }));
  const input = screen.getByRole('combobox', { name: /Services/ });
  await interaction.click(screen.getByRole('button', { name: 'Test submission' }));
  expect(input).toHaveAttribute('aria-invalid', 'true');

  await interaction.type(input, 'missing');
  expect(await screen.findByText('No options found.')).toBeVisible();
  await interaction.clear(input);
  await interaction.type(input, 'Design');
  expect(screen.queryByRole('option', { name: 'Support' })).not.toBeInTheDocument();
  await interaction.click(await screen.findByRole('option', { name: 'Design' }));
  await interaction.type(input, 'Development');
  await interaction.keyboard('{ArrowDown}{Enter}');
  expect(await screen.findByRole('button', { name: 'Remove Development' })).toBeInTheDocument();
  await interaction.keyboard('{Escape}');
  await interaction.click(screen.getByRole('button', { name: 'Test submission' }));
  const output = screen.getByRole('heading', { name: 'Submission preview' }).closest('aside');
  if (!output) throw new Error('Submission preview missing');
  expect(await within(output).findByText(/"services":/)).toHaveTextContent('"services": [ "1", 1 ]');

  await interaction.click(screen.getByRole('button', { name: 'Remove Design' }));
  await interaction.click(screen.getByRole('button', { name: 'Test submission' }));
  expect(await within(output).findByText(/"services":/)).toHaveTextContent('"services": [ 1 ]');
});
