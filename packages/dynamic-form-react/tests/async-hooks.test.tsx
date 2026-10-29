import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFormData, useFormSubmit } from '../src/index.js';

describe('useFormSubmit', () => {
  it('keeps submission success and failure state separate', async () => {
    const submitter = vi
      .fn<(payload: string) => Promise<string>>()
      .mockResolvedValueOnce('saved')
      .mockRejectedValueOnce(new Error('network failed'));
    const { result } = renderHook(() => useFormSubmit(submitter));

    await act(async () => {
      await result.current.submit('first');
    });
    expect(result.current).toMatchObject({
      data: 'saved',
      error: null,
      isSubmitting: false,
      success: true,
    });

    await act(async () => {
      await expect(result.current.submit('second')).rejects.toThrow('network failed');
    });
    expect(result.current.success).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);

    act(() => result.current.resetStatus());
    expect(result.current).toMatchObject({
      data: undefined,
      error: null,
      isSubmitting: false,
      success: false,
    });
  });
});

describe('useFormData', () => {
  it('loads data and supports an application-provided refetch function', async () => {
    const loader = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');
    const { result } = renderHook(() => useFormData(loader));

    await waitFor(() => expect(result.current.data).toBe('first'));
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.data).toBe('second');
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

