import {
  createInitialValues,
  evaluateCalculations,
  getActiveFields,
  getFieldMap,
  prepareSubmission,
  validateFormValues,
  type FormValues,
  type ValueValidationIssue,
} from '@thuraaung2493/dynamic-form-core';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import type {
  DynamicFormState,
  InvalidSubmitHandler,
  SetValueOptions,
  SubmitHandler,
  UseDynamicFormOptions,
  ValuesUpdater,
} from '../form-types.js';

const FORM_ERROR = '$form';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((entry, index) => valuesEqual(entry, right[index]))
    );
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) => Object.hasOwn(right, key) && valuesEqual(left[key], right[key]),
      )
    );
  }
  return false;
}

function issuesToErrors(
  issues: readonly ValueValidationIssue[],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    (errors[issue.fieldName] ??= []).push(issue.message);
  }
  return errors;
}

export function useDynamicForm({
  schema,
  initialData,
  reinitializeKey,
  externalValidator,
  validateInactive = false,
  validateDisabled = false,
}: UseDynamicFormOptions): DynamicFormState {
  const initialValues = useMemo(
    () => createInitialValues(schema, initialData),
    // initialData intentionally reinitializes only when reinitializeKey changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schema, reinitializeKey],
  );
  const [values, setValuesState] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [baseline, setBaseline] = useState(initialValues);
  const schemaRef = useRef(schema);
  const reinitializeKeyRef = useRef(reinitializeKey);
  const validationRequestRef = useRef(0);
  const lastValidationErrorsRef = useRef<Record<string, string[]>>({});

  useEffect(() => {
    const shouldReinitialize = reinitializeKeyRef.current !== reinitializeKey;
    const schemaChanged = schemaRef.current !== schema;
    schemaRef.current = schema;
    reinitializeKeyRef.current = reinitializeKey;

    if (shouldReinitialize) {
      setBaseline(initialValues);
      setValuesState(initialValues);
      setErrors({});
      setTouchedState({});
      return;
    }

    if (schemaChanged) {
      setValuesState((currentValues) => createInitialValues(schema, currentValues));
      setErrors({});
    }
  }, [initialValues, reinitializeKey, schema]);

  const builtInValidation = useMemo(
    () =>
      validateFormValues(schema, values, {
        includeInactive: validateInactive,
        validateDisabled,
      }),
    [schema, validateDisabled, validateInactive, values],
  );

  const runValidation = useCallback(
    async (fieldName?: string): Promise<boolean> => {
      const requestId = ++validationRequestRef.current;
      setIsValidating(true);

      const builtIn = validateFormValues(schema, values, {
        includeInactive: validateInactive,
        validateDisabled,
      });
      let allIssues = builtIn.issues;

      try {
        if (externalValidator) {
          const fields = validateInactive
            ? [...getFieldMap(schema).values()]
            : getActiveFields(schema, builtIn.values);
          const externalIssues = await externalValidator({
            fields,
            schema,
            values: builtIn.values,
          });
          allIssues = [...allIssues, ...externalIssues];
        }

        if (requestId !== validationRequestRef.current) {
          return false;
        }

        const nextErrors = issuesToErrors(allIssues);
        lastValidationErrorsRef.current = nextErrors;
        if (fieldName === undefined) {
          setErrors(nextErrors);
        } else {
          setErrors((currentErrors) => {
            const updatedErrors = { ...currentErrors };
            if (nextErrors[fieldName]) {
              updatedErrors[fieldName] = nextErrors[fieldName];
            } else {
              delete updatedErrors[fieldName];
            }
            return updatedErrors;
          });
        }

        return fieldName === undefined
          ? allIssues.length === 0
          : !allIssues.some((issue) => issue.fieldName === fieldName);
      } catch (error) {
        if (requestId === validationRequestRef.current) {
          const message = error instanceof Error ? error.message : 'Validation failed.';
          setErrors((currentErrors) => ({
            ...currentErrors,
            [FORM_ERROR]: [message],
          }));
          lastValidationErrorsRef.current = {
            ...lastValidationErrorsRef.current,
            [FORM_ERROR]: [message],
          };
        }
        return false;
      } finally {
        if (requestId === validationRequestRef.current) {
          setIsValidating(false);
        }
      }
    }, [externalValidator, schema, validateDisabled, validateInactive, values],
  );

  const setValue = useCallback(
    (fieldName: string, value: unknown, options: SetValueOptions = {}): void => {
      if (!getFieldMap(schema).has(fieldName)) {
        throw new Error(`Unknown form field "${fieldName}".`);
      }

      setValuesState((currentValues) =>
        evaluateCalculations(schema, { ...currentValues, [fieldName]: value }).values,
      );
      setErrors({});
      lastValidationErrorsRef.current = {};
      if (options.touch) {
        setTouchedState((currentTouched) => ({
          ...currentTouched,
          [fieldName]: true,
        }));
      }
    },
    [schema],
  );

  const setValues = useCallback(
    (updater: ValuesUpdater): void => {
      setValuesState((currentValues) => {
        const updatedValues =
          typeof updater === 'function' ? updater(currentValues) : updater;
        return createInitialValues(schema, { ...currentValues, ...updatedValues });
      });
      setErrors({});
      lastValidationErrorsRef.current = {};
    },
    [schema],
  );

  const setTouched = useCallback((fieldName: string, isTouched = true): void => {
    setTouchedState((currentTouched) => ({
      ...currentTouched,
      [fieldName]: isTouched,
    }));
  }, []);

  const reset = useCallback(
    (nextInitialData?: FormValues): void => {
      const resetValues =
        nextInitialData === undefined
          ? baseline
          : createInitialValues(schema, nextInitialData);
      if (nextInitialData !== undefined) {
        setBaseline(resetValues);
      }
      setValuesState(resetValues);
      setErrors({});
      lastValidationErrorsRef.current = {};
      setTouchedState({});
    },
    [baseline, schema],
  );

  const getValues = useCallback(
    (options = {}) => prepareSubmission(schema, values, options),
    [schema, values],
  );

  const handleSubmit = useCallback(
    (onValid: SubmitHandler, onInvalid?: InvalidSubmitHandler) =>
      async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const activeTouched = Object.fromEntries(
          getActiveFields(schema, values).map((field) => [field.name, true]),
        );
        setTouchedState(activeTouched);

        const valid = await runValidation();
        if (valid) {
          await onValid(prepareSubmission(schema, values));
        } else if (onInvalid) {
          await onInvalid(lastValidationErrorsRef.current);
        }
      },
    [runValidation, schema, values],
  );

  return {
    errors,
    getValues,
    handleSubmit,
    isDirty: !valuesEqual(values, baseline),
    isValid: builtInValidation.valid && Object.keys(errors).length === 0,
    isValidating,
    reset,
    setTouched,
    setValue,
    setValues,
    touched,
    validate: () => runValidation(),
    validateField: (fieldName) => runValidation(fieldName),
    values,
  };
}
