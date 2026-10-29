import type {
  FormSchema,
  FormValues,
  PrepareSubmissionOptions,
  ValueValidationContext,
  ValueValidationIssue,
} from '@thuraaung2493/dynamic-form-core';
import type { FormEventHandler } from 'react';

export type AsyncValueValidator = (
  context: ValueValidationContext,
) => Promise<readonly ValueValidationIssue[]> | readonly ValueValidationIssue[];

export interface UseDynamicFormOptions {
  schema: FormSchema;
  initialData?: FormValues | undefined;
  reinitializeKey?: string | number | undefined;
  externalValidator?: AsyncValueValidator | undefined;
  validateInactive?: boolean | undefined;
  validateDisabled?: boolean | undefined;
}

export interface SetValueOptions {
  touch?: boolean | undefined;
}

export type ValuesUpdater =
  | FormValues
  | ((currentValues: FormValues) => FormValues);

export type SubmitHandler = (values: FormValues) => void | Promise<void>;
export type InvalidSubmitHandler = (
  errors: Record<string, string[]>,
) => void | Promise<void>;

export interface DynamicFormState {
  values: FormValues;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isValid: boolean;
  isValidating: boolean;
  setValue: (
    fieldName: string,
    value: unknown,
    options?: SetValueOptions,
  ) => void;
  setValues: (updater: ValuesUpdater) => void;
  setTouched: (fieldName: string, touched?: boolean) => void;
  validate: () => Promise<boolean>;
  validateField: (fieldName: string) => Promise<boolean>;
  reset: (nextInitialData?: FormValues) => void;
  getValues: (options?: PrepareSubmissionOptions) => FormValues;
  handleSubmit: (
    onValid: SubmitHandler,
    onInvalid?: InvalidSubmitHandler,
  ) => FormEventHandler<HTMLFormElement>;
}
