import type {
  Field,
  FieldType,
  FormValues,
} from '@thuraaung2493/dynamic-form-core';
import type {
  ComponentType,
  FormEventHandler,
  ReactNode,
} from 'react';

export interface AdapterFormProps {
  children: ReactNode;
  className?: string | undefined;
  formErrors: readonly string[];
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export interface AdapterFieldProps {
  children: ReactNode;
  depth: number;
  errors: readonly string[];
  field: Field;
  helpId: string;
  inputId: string;
  touched: boolean;
}

export interface AdapterSubmitButtonProps {
  disabled: boolean;
  isSubmitting: boolean;
  label: string;
}

export interface FieldRendererProps {
  describedBy?: string | undefined;
  depth: number;
  disabled: boolean;
  errors: readonly string[];
  field: Field;
  inputId: string;
  onBlur: () => void;
  onChange: (value: unknown) => void;
  readOnly: boolean;
  touched: boolean;
  value: unknown;
  values: FormValues;
}

export type FieldRenderer = ComponentType<FieldRendererProps>;

export interface DynamicFormAdapter {
  Form: ComponentType<AdapterFormProps>;
  Field: ComponentType<AdapterFieldProps>;
  SubmitButton: ComponentType<AdapterSubmitButtonProps>;
  FieldRenderer: FieldRenderer;
}

export interface CustomFieldRenderers {
  byName?: Readonly<Record<string, FieldRenderer>>;
  byType?: Readonly<Partial<Record<FieldType, FieldRenderer>>>;
}
