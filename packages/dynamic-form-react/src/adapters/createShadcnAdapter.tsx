import type { ConditionalOption, OptionValue } from '@thuraaung2493/dynamic-form-core';
import type { ChangeEvent, ElementType, FocusEvent } from 'react';

import type {
  AdapterFieldProps,
  AdapterFormProps,
  AdapterSubmitButtonProps,
  DynamicFormAdapter,
  FieldRenderer,
  FieldRendererProps,
} from '../adapter-types.js';
import { ImagePreview } from './ImagePreview.js';

/** Components generated in the consuming application's shadcn/ui project. */
export interface ShadcnAdapterComponents {
  Button: ElementType;
  Checkbox: ElementType;
  Input: ElementType;
  Label: ElementType;
  RadioGroup: ElementType;
  RadioGroupItem: ElementType;
  Select: ElementType;
  SelectContent: ElementType;
  SelectItem: ElementType;
  SelectTrigger: ElementType;
  SelectValue: ElementType;
  Textarea: ElementType;
}

export interface ShadcnAdapterOptions {
  components: ShadcnAdapterComponents;
  /** Defaults to Base UI. Select and radio use the corresponding shadcn/ui API. */
  variant?: 'base' | 'radix';
  /** shadcn/ui has no single multiselect control; register the app's combobox. */
  renderers: {
    multiselect: FieldRenderer;
  };
}

const optionIndex = (
  options: readonly { value: OptionValue }[],
  value: unknown,
): string => {
  const index = options.findIndex((option) => option.value === value);
  return index < 0 ? '' : String(index);
};

const selectedOptionValue = (
  options: readonly ConditionalOption[],
  index: string | null,
): OptionValue | '' => {
  if (index === null || index === '') {
    return '';
  }
  return options[Number(index)]?.value ?? '';
};

function buildShadcnAdapter({
  components: ui,
  renderers,
  variant = 'base',
}: ShadcnAdapterOptions): DynamicFormAdapter {
  function Form({ children, className, formErrors, onSubmit }: AdapterFormProps) {
    return (
      <form className={className} noValidate onSubmit={onSubmit}>
        {formErrors.length > 0 && (
          <div className="mb-4 text-sm text-destructive" role="alert">
            {formErrors.join(' ')}
          </div>
        )}
        <div className="grid gap-5">{children}</div>
      </form>
    );
  }

  function Field({
    children,
    depth,
    errors,
    field,
    helpId,
    inputId,
    touched,
  }: AdapterFieldProps) {
    const visibleErrors = touched ? errors : [];
    return (
      <div
        className={depth > 0 ? 'grid gap-2 border-l pl-4' : 'grid gap-2'}
        data-depth={depth}
        data-field-name={field.name}
      >
        <ui.Label htmlFor={inputId} id={`${inputId}-label`}>
          {field.label}
          {field.required && <span aria-hidden="true"> *</span>}
        </ui.Label>
        {children}
        {field.helpText && (
          <p className="text-sm text-muted-foreground" id={helpId}>
            {field.helpText}
          </p>
        )}
        {visibleErrors.length > 0 && (
          <ul className="text-sm text-destructive" id={`${inputId}-errors`}>
            {visibleErrors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}
      </div>
    );
  }

  function SubmitButton({ disabled, isSubmitting, label }: AdapterSubmitButtonProps) {
    return (
      <ui.Button className="mt-5" disabled={disabled} type="submit">
        {isSubmitting ? 'Submitting…' : label}
      </ui.Button>
    );
  }

  function FieldRenderer({
    describedBy,
    disabled,
    errors,
    field,
    inputId,
    onBlur,
    onChange,
    readOnly,
    touched,
    value,
    ...rest
  }: FieldRendererProps) {
    const invalid = touched && errors.length > 0;
    const common = {
      'aria-describedby': describedBy,
      'aria-invalid': invalid,
      disabled,
      id: inputId,
      name: field.name,
      onBlur,
      required: field.required,
    };

    switch (field.type) {
      case 'text':
      case 'textarea': {
        const Control = field.type === 'text' ? ui.Input : ui.Textarea;
        return (
          <Control
            {...common}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange(event.target.value)
            }
            placeholder={field.placeholder}
            readOnly={readOnly}
            value={typeof value === 'string' ? value : ''}
            {...(field.type === 'text' ? { type: 'text' } : {})}
          />
        );
      }
      case 'number':
      case 'currency':
        return (
          <ui.Input
            {...common}
            max={field.validation?.max}
            min={field.validation?.min}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange(event.target.value === '' ? '' : Number(event.target.value))
            }
            placeholder={field.placeholder}
            readOnly={readOnly}
            step={field.validation?.step ?? 'any'}
            type="number"
            value={typeof value === 'number' || typeof value === 'string' ? value : ''}
          />
        );
      case 'checkbox':
        return (
          <ui.Checkbox
            {...common}
            aria-labelledby={`${inputId}-label`}
            checked={value === true}
            disabled={disabled || readOnly}
            onCheckedChange={(checked: boolean | 'indeterminate') => onChange(checked === true)}
          />
        );
      case 'select': {
        const items = field.options.map((option, index) => ({
          label: option.label,
          value: String(index),
        }));
        const index = optionIndex(field.options, value);
        return (
          <ui.Select
            disabled={disabled || (variant === 'radix' && readOnly)}
            name={field.name}
            onValueChange={(next: string | null) =>
              onChange(selectedOptionValue(field.options, next))
            }
            required={field.required}
            value={index === '' && variant === 'base' ? null : index}
            {...(variant === 'base' ? { items, readOnly } : {})}
          >
            <ui.SelectTrigger
              aria-describedby={describedBy}
              aria-invalid={invalid}
              aria-labelledby={`${inputId}-label`}
              id={inputId}
              onBlur={onBlur}
            >
              <ui.SelectValue placeholder={field.placeholder ?? 'Select an option'} />
            </ui.SelectTrigger>
            <ui.SelectContent>
              {items.map((item) => (
                <ui.SelectItem key={item.value} value={item.value}>
                  {item.label}
                </ui.SelectItem>
              ))}
            </ui.SelectContent>
          </ui.Select>
        );
      }
      case 'radio':
        return (
          <ui.RadioGroup
            aria-describedby={describedBy}
            aria-invalid={invalid}
            aria-labelledby={`${inputId}-label`}
            disabled={disabled || (variant === 'radix' && readOnly)}
            name={field.name}
            onBlur={(event: FocusEvent<HTMLElement>) => {
              if (!event.currentTarget.contains(event.relatedTarget)) onBlur();
            }}
            onValueChange={(next: string) =>
              onChange(selectedOptionValue(field.options, next))
            }
            required={field.required}
            value={optionIndex(field.options, value)}
            {...(variant === 'base' ? { readOnly } : {})}
          >
            {field.options.map((option, index) => {
              const optionId = index === 0 ? inputId : `${inputId}-${index}`;
              return (
                <div className="flex items-center gap-2" key={optionId}>
                  <ui.RadioGroupItem
                    aria-invalid={invalid}
                    id={optionId}
                    value={String(index)}
                  />
                  <ui.Label htmlFor={optionId}>{option.label}</ui.Label>
                </div>
              );
            })}
          </ui.RadioGroup>
        );
      case 'multiselect': {
        const Multiselect = renderers.multiselect;
        return (
          <Multiselect
            {...rest}
            describedBy={describedBy}
            disabled={disabled}
            errors={errors}
            field={field}
            inputId={inputId}
            onBlur={onBlur}
            onChange={onChange}
            readOnly={readOnly}
            touched={touched}
            value={value}
          />
        );
      }
      case 'date':
      case 'time':
      case 'datetime':
        return (
          <ui.Input
            {...common}
            max={field.validation?.max}
            min={field.validation?.min}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange(event.target.value)
            }
            readOnly={readOnly}
            type={field.type === 'datetime' ? 'datetime-local' : field.type}
            value={typeof value === 'string' ? value : ''}
          />
        );
      case 'file':
      case 'image':
        return (
          <>
            <ui.Input
              {...common}
              accept={
                field.validation?.accept?.join(',') ??
                (field.type === 'image' ? 'image/*' : undefined)
              }
              disabled={disabled || readOnly}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onChange(event.target.files?.[0] ?? null)
              }
              type="file"
            />
            {field.type === 'image' && (
              <ImagePreview className="max-h-48 rounded-md" value={value} />
            )}
          </>
        );
      case 'calculation':
        return (
          <output
            aria-describedby={describedBy}
            aria-labelledby={`${inputId}-label`}
            id={inputId}
          >
            {typeof value === 'number' ? value : '—'}
          </output>
        );
    }
  }

  return { Field, FieldRenderer, Form, SubmitButton };
}

/**
 * Creates a complete adapter from application-owned shadcn/ui components.
 * The former full-adapter signature remains available for existing consumers.
 */
export function createShadcnAdapter(adapter: DynamicFormAdapter): DynamicFormAdapter;
export function createShadcnAdapter(options: ShadcnAdapterOptions): DynamicFormAdapter;
export function createShadcnAdapter(
  input: DynamicFormAdapter | ShadcnAdapterOptions,
): DynamicFormAdapter {
  if (!('components' in input)) return input;
  if (!input.renderers?.multiselect) {
    throw new Error('createShadcnAdapter requires a multiselect renderer.');
  }
  return buildShadcnAdapter(input);
}
