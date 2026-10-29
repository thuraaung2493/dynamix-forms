import type { OptionValue } from '@thuraaung2493/dynamic-form-core';
import type { FieldRendererProps } from '@thuraaung2493/dynamic-form-react';

import { MultiSelectCombobox } from '../../shared/ui/MultiSelectCombobox.js';

export function PreviewMultiselect({
  field, value, onChange, onBlur, inputId, describedBy, disabled, readOnly, errors, touched,
}: FieldRendererProps) {
  if (field.type !== 'multiselect') return null;
  const selected: OptionValue[] = Array.isArray(value)
    ? value.filter((entry): entry is OptionValue => typeof entry === 'string' || typeof entry === 'number')
    : [];

  return (
    <MultiSelectCombobox
      options={field.options}
      value={selected}
      onChange={onChange}
      onBlur={onBlur}
      id={inputId}
      label={field.label}
      describedBy={describedBy}
      placeholder={field.placeholder}
      disabled={disabled}
      readOnly={readOnly}
      invalid={touched && errors.length > 0}
      required={Boolean(field.required)}
    />
  );
}
