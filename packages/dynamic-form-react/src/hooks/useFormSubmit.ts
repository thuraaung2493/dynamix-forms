import { useCallback, useRef, useState } from 'react';

export interface FormSubmitState<TPayload, TResult> {
  isSubmitting: boolean;
  error: unknown | null;
  success: boolean;
  data: TResult | undefined;
  submit: (payload: TPayload) => Promise<TResult>;
  resetStatus: () => void;
}

export function useFormSubmit<TPayload, TResult>(
  submitter: (payload: TPayload) => Promise<TResult>,
): FormSubmitState<TPayload, TResult> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState<TResult | undefined>();
  const requestRef = useRef(0);

  const submit = useCallback(
    async (payload: TPayload): Promise<TResult> => {
      const requestId = ++requestRef.current;
      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      try {
        const result = await submitter(payload);
        if (requestId === requestRef.current) {
          setData(result);
          setSuccess(true);
        }
        return result;
      } catch (submissionError) {
        if (requestId === requestRef.current) {
          setData(undefined);
          setError(submissionError);
        }
        throw submissionError;
      } finally {
        if (requestId === requestRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [submitter],
  );

  const resetStatus = useCallback((): void => {
    requestRef.current += 1;
    setData(undefined);
    setError(null);
    setIsSubmitting(false);
    setSuccess(false);
  }, []);

  return { data, error, isSubmitting, resetStatus, submit, success };
}

