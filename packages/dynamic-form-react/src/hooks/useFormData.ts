import { useCallback, useEffect, useRef, useState } from 'react';

export interface FormDataOptions {
  enabled?: boolean;
}

export interface FormDataState<TData> {
  data: TData | undefined;
  isLoading: boolean;
  error: unknown | null;
  refetch: () => Promise<TData | undefined>;
}

export function useFormData<TData>(
  loader: (signal: AbortSignal) => Promise<TData>,
  { enabled = true }: FormDataOptions = {},
): FormDataState<TData> {
  const [data, setData] = useState<TData | undefined>();
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown | null>(null);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async (): Promise<TData | undefined> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await loader(controller.signal);
      if (requestId === requestRef.current && !controller.signal.aborted) {
        setData(result);
      }
      return controller.signal.aborted ? undefined : result;
    } catch (loadError) {
      if (controller.signal.aborted) {
        return undefined;
      }
      if (requestId === requestRef.current) {
        setError(loadError);
      }
      return undefined;
    } finally {
      if (requestId === requestRef.current && !controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [loader]);

  useEffect(() => {
    let active = true;
    if (enabled) {
      queueMicrotask(() => {
        if (active) {
          void refetch();
        }
      });
    } else {
      queueMicrotask(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    }
    return () => {
      active = false;
      controllerRef.current?.abort();
    };
  }, [enabled, refetch]);

  return { data, error, isLoading, refetch };
}
