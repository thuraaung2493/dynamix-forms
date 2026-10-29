import type {
  ConditionalOption,
  OptionValue,
} from '@thuraaung2493/dynamic-form-core';
import type { ChangeEvent } from 'react';

import type {
  AdapterFieldProps,
  AdapterFormProps,
  AdapterSubmitButtonProps,
  DynamicFormAdapter,
  FieldRendererProps,
} from '../adapter-types.js';
import { ImagePreview } from './ImagePreview.js';

interface HtmlAdapterClasses {
  button: string;
  calculation: string;
  checkbox: string;
  control: string;
  error: string;
  errors: string;
  field: string;
  fieldNested: string;
  form: string;
  formError: string;
  help: string;
  label: string;
  option: string;
  options: string;
  preview: string;
}

const nativeClasses: HtmlAdapterClasses = {
  button: 'df-native__button',
  calculation: 'df-native__calculation',
  checkbox: 'df-native__checkbox',
  control: 'df-native__control',
  error: 'df-native__error',
  errors: 'df-native__errors',
  field: 'df-native__field',
  fieldNested: 'df-native__field--nested',
  form: 'df-native',
  formError: 'df-native__form-error',
  help: 'df-native__help',
  label: 'df-native__label',
  option: 'df-native__option',
  options: 'df-native__options',
  preview: 'df-native__preview',
};

const bootstrapClasses: HtmlAdapterClasses = {
  button: 'df-bootstrap__button',
  calculation: 'df-bootstrap__calculation',
  checkbox: 'df-bootstrap__checkbox',
  control: 'df-bootstrap__control',
  error: 'df-bootstrap__error',
  errors: 'df-bootstrap__errors',
  field: 'df-bootstrap__field',
  fieldNested: 'df-bootstrap__field--nested',
  form: 'df-bootstrap',
  formError: 'df-bootstrap__form-error',
  help: 'df-bootstrap__help',
  label: 'df-bootstrap__label',
  option: 'df-bootstrap__option',
  options: 'df-bootstrap__options',
  preview: 'df-bootstrap__preview',
};

const optionIndex = (
  options: readonly { value: OptionValue }[],
  value: unknown,
): string => {
  const index = options.findIndex((option) => option.value === value);
  return index < 0 ? '' : String(index);
};

const selectedOptionValue = (
  options: readonly ConditionalOption[],
  index: string,
): OptionValue | '' => {
  if (index === '') {
    return '';
  }
  return options[Number(index)]?.value ?? '';
};

function createHtmlFieldRenderer(classes: HtmlAdapterClasses) {
  return function HtmlFieldRenderer({
    describedBy,
    disabled,
    field,
    inputId,
    onBlur,
    onChange,
    readOnly,
    value,
  }: FieldRendererProps) {
    const invalid = describedBy?.includes('errors') ?? false;
    const common = {
      'aria-describedby': describedBy,
      'aria-invalid': invalid,
      className: classes.control,
      disabled,
      id: inputId,
      name: field.name,
      onBlur,
      required: field.required,
    } as const;

    switch (field.type) {
      case 'text':
        return (
          <input
            {...common}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            readOnly={readOnly}
            type="text"
            value={typeof value === 'string' ? value : ''}
          />
        );
      case 'textarea':
        return (
          <textarea
            {...common}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            readOnly={readOnly}
            value={typeof value === 'string' ? value : ''}
          />
        );
      case 'number':
      case 'currency':
        return (
          <input
            {...common}
            max={field.validation?.max}
            min={field.validation?.min}
            onChange={(event) =>
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
          <input
            {...common}
            checked={value === true}
            className={classes.checkbox}
            disabled={disabled || readOnly}
            onChange={(event) => onChange(event.target.checked)}
            type="checkbox"
          />
        );
      case 'select': {
        return (
          <select
            {...common}
            disabled={disabled || readOnly}
            onChange={(event) =>
              onChange(selectedOptionValue(field.options, event.target.value))
            }
            value={optionIndex(field.options, value)}
          >
            <option value="">{field.placeholder ?? 'Select an option'}</option>
            {field.options.map((option, index) => (
              <option key={`${typeof option.value}:${String(option.value)}`} value={index}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }
      case 'radio':
        return (
          <div aria-describedby={describedBy} className={classes.options} role="radiogroup">
            {field.options.map((option, index) => (
              <label className={classes.option} key={`${typeof option.value}:${String(option.value)}`}>
                <input
                  checked={option.value === value}
                  disabled={disabled || readOnly}
                  id={index === 0 ? inputId : undefined}
                  name={field.name}
                  onBlur={onBlur}
                  onChange={() => onChange(option.value)}
                  type="radio"
                  value={index}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );
      case 'multiselect': {
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <select
            {...common}
            disabled={disabled || readOnly}
            multiple
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onChange(
                [...event.target.selectedOptions]
                  .map((option) => field.options[Number(option.value)]?.value)
                  .filter((entry): entry is OptionValue => entry !== undefined),
              )
            }
            value={field.options
              .map((option, index) =>
                selectedValues.some((selected) => selected === option.value)
                  ? String(index)
                  : undefined,
              )
              .filter((entry): entry is string => entry !== undefined)}
          >
            {field.options.map((option, index) => (
              <option key={`${typeof option.value}:${String(option.value)}`} value={index}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }
      case 'date':
      case 'time':
      case 'datetime':
        return (
          <input
            {...common}
            max={field.validation?.max}
            min={field.validation?.min}
            onChange={(event) => onChange(event.target.value)}
            readOnly={readOnly}
            type={field.type === 'datetime' ? 'datetime-local' : field.type}
            value={typeof value === 'string' ? value : ''}
          />
        );
      case 'file':
      case 'image':
        return (
          <>
            <input
              {...common}
              accept={
                field.validation?.accept?.join(',') ??
                (field.type === 'image' ? 'image/*' : undefined)
              }
              disabled={disabled || readOnly}
              onChange={(event) => onChange(event.target.files?.[0] ?? null)}
              type="file"
            />
            {field.type === 'image' ? (
              <ImagePreview className={classes.preview} value={value} />
            ) : null}
          </>
        );
      case 'calculation':
        return (
          <output
            aria-describedby={describedBy}
            className={classes.calculation}
            id={inputId}
          >
            {typeof value === 'number' ? value : '—'}
          </output>
        );
    }
  };
}

function createHtmlAdapter(classes: HtmlAdapterClasses): DynamicFormAdapter {
  function Form({ children, className, formErrors, onSubmit }: AdapterFormProps) {
    return (
      <form
        className={[classes.form, className].filter(Boolean).join(' ')}
        noValidate
        onSubmit={onSubmit}
      >
        {formErrors.length > 0 ? (
          <div className={classes.formError} role="alert">
            {formErrors.join(' ')}
          </div>
        ) : null}
        {children}
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
        className={[classes.field, depth > 0 ? classes.fieldNested : undefined]
          .filter(Boolean)
          .join(' ')}
        data-depth={depth}
        data-field-name={field.name}
      >
        <label className={classes.label} htmlFor={inputId}>
          {field.label}
          {field.required ? <span aria-hidden="true"> *</span> : null}
        </label>
        {children}
        {field.helpText ? (
          <div className={classes.help} id={helpId}>
            {field.helpText}
          </div>
        ) : null}
        {visibleErrors.length > 0 ? (
          <ul className={classes.errors} id={`${inputId}-errors`}>
            {visibleErrors.map((error) => (
              <li className={classes.error} key={error}>
                {error}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  function SubmitButton({ disabled, isSubmitting, label }: AdapterSubmitButtonProps) {
    return (
      <button className={classes.button} disabled={disabled} type="submit">
        {isSubmitting ? 'Submitting…' : label}
      </button>
    );
  }

  return {
    Field,
    FieldRenderer: createHtmlFieldRenderer(classes),
    Form,
    SubmitButton,
  };
}

export const nativeAdapter = createHtmlAdapter(nativeClasses);
export const bootstrapAdapter = createHtmlAdapter(bootstrapClasses);
