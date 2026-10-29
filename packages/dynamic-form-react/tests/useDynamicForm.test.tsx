import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDynamicForm } from '../src/index.js';
import { schema } from './fixtures.js';

describe('useDynamicForm', () => {
  it('manages values, calculations, dirty state, reset, and prepared values', () => {
    const { result } = renderHook(() => useDynamicForm({ schema }));

    expect(result.current.values.total).toBe(8);
    expect(result.current.isDirty).toBe(false);

    act(() => result.current.setValue('amount', 20, { touch: true }));

    expect(result.current.values.total).toBe(18);
    expect(result.current.touched.amount).toBe(true);
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.reset());
    expect(result.current.values.total).toBe(8);
    expect(result.current.isDirty).toBe(false);
  });

  it('does not overwrite edits when initialData changes without a new key', () => {
    const { result, rerender } = renderHook(
      ({ name, resetKey }: { name: string; resetKey: number }) =>
        useDynamicForm({
          initialData: { name },
          reinitializeKey: resetKey,
          schema,
        }),
      { initialProps: { name: 'Initial', resetKey: 1 } },
    );

    act(() => result.current.setValue('name', 'Edited'));
    rerender({ name: 'Server update', resetKey: 1 });
    expect(result.current.values.name).toBe('Edited');

    rerender({ name: 'Server update', resetKey: 2 });
    expect(result.current.values.name).toBe('Server update');
    expect(result.current.isDirty).toBe(false);
  });

  it('validates active fields and asynchronous external rules', async () => {
    const externalValidator = vi.fn(async ({ values }) =>
      values.name === 'Taken'
        ? [
            {
              code: 'custom' as const,
              fieldName: 'name',
              message: 'Name is already taken.',
            },
          ]
        : [],
    );
    const { result } = renderHook(() =>
      useDynamicForm({ externalValidator, schema }),
    );

    act(() => {
      result.current.setValue('kind', 'simple');
      result.current.setValue('name', 'Taken');
    });

    let valid = true;
    await act(async () => {
      valid = await result.current.validate();
    });

    expect(valid).toBe(false);
    expect(result.current.errors.name).toEqual(['Name is already taken.']);
    expect(result.current.errors).not.toHaveProperty('detail');
    expect(externalValidator).toHaveBeenCalledOnce();
  });

  it('rejects updates to names that are not in the schema', () => {
    const { result } = renderHook(() => useDynamicForm({ schema }));

    expect(() => act(() => result.current.setValue('unknown', 'value'))).toThrow(
      'Unknown form field "unknown".',
    );
  });
});

