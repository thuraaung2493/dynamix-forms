import type {
  Field,
  FormSchema,
  FormValues,
} from '@thuraaung2493/dynamic-form-core';
import { useId, type ReactNode } from 'react';

import type {
  CustomFieldRenderers,
  DynamicFormAdapter,
  FieldRenderer,
} from './adapter-types.js';
import type { AsyncValueValidator, DynamicFormState } from './form-types.js';
import { nativeAdapter } from './adapters/htmlAdapters.js';
import { useDynamicForm } from './hooks/useDynamicForm.js';
import { useFormSubmit } from './hooks/useFormSubmit.js';

export interface DynamicFormProps<TResult = unknown> {
  schema: FormSchema;
  initialData?: FormValues;
  reinitializeKey?: string | number;
  adapter?: DynamicFormAdapter;
  customRenderers?: CustomFieldRenderers;
  externalValidator?: AsyncValueValidator;
  onSubmit: (values: FormValues) => Promise<TResult>;
  onSubmitError?: (error: unknown) => void;
  submitLabel?: string;
  className?: string;
  disabled?: boolean;
}

const safeIdPart = (value: string): string =>
  value.replace(/[^A-Za-z0-9_-]/g, '-');

const selectedChildren = (field: Field, value: unknown): readonly Field[] => {
  if (field.type !== 'select' && field.type !== 'radio') {
    return [];
  }
  return field.options.find((option) => option.value === value)?.fields ?? [];
};

export function DynamicForm<TResult = unknown>({
  adapter = nativeAdapter,
  className,
  customRenderers,
  disabled = false,
  externalValidator,
  initialData,
  onSubmit,
  onSubmitError,
  reinitializeKey,
  schema,
  submitLabel = 'Submit',
}: DynamicFormProps<TResult>) {
  const idPrefix = useId();
  const form = useDynamicForm({
    externalValidator,
    initialData,
    reinitializeKey,
    schema,
  });
  const submission = useFormSubmit(onSubmit);

  const renderFields = (fields: readonly Field[], depth: number): ReactNode =>
    fields.map((field) => {
      const inputId = `${safeIdPart(idPrefix)}-${safeIdPart(field.name)}`;
      const helpId = `${inputId}-help`;
      const fieldErrors = form.errors[field.name] ?? [];
      const isTouched = form.touched[field.name] ?? false;
      const describedBy = [
        field.helpText ? helpId : undefined,
        isTouched && fieldErrors.length > 0 ? `${inputId}-errors` : undefined,
      ]
        .filter(Boolean)
        .join(' ');
      const Renderer: FieldRenderer =
        customRenderers?.byName?.[field.name] ??
        customRenderers?.byType?.[field.type] ??
        adapter.FieldRenderer;

      return (
        <adapter.Field
          depth={depth}
          errors={fieldErrors}
          field={field}
          helpId={helpId}
          inputId={inputId}
          key={field.name}
          touched={isTouched}
        >
          <Renderer
            depth={depth}
            describedBy={describedBy || undefined}
            disabled={disabled || Boolean(field.disabled)}
            errors={fieldErrors}
            field={field}
            inputId={inputId}
            onBlur={() => {
              form.setTouched(field.name);
              void form.validateField(field.name);
            }}
            onChange={(value) => form.setValue(field.name, value)}
            readOnly={Boolean(field.readOnly) || field.type === 'calculation'}
            touched={isTouched}
            value={form.values[field.name]}
            values={form.values}
          />
          {renderFields(selectedChildren(field, form.values[field.name]), depth + 1)}
        </adapter.Field>
      );
    });

  const handleValidSubmit = async (values: FormValues): Promise<void> => {
    try {
      await submission.submit(values);
    } catch (error) {
      onSubmitError?.(error);
    }
  };

  return (
    <adapter.Form
      className={className}
      formErrors={form.errors.$form ?? []}
      onSubmit={form.handleSubmit(handleValidSubmit)}
    >
      {renderFields(schema.fields, 0)}
      <adapter.SubmitButton
        disabled={disabled || submission.isSubmitting || form.isValidating}
        isSubmitting={submission.isSubmitting}
        label={submitLabel}
      />
    </adapter.Form>
  );
}

export type { DynamicFormState };
