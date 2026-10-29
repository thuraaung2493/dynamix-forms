export const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'currency',
  'checkbox',
  'select',
  'radio',
  'multiselect',
  'date',
  'time',
  'datetime',
  'file',
  'image',
  'calculation',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];
export type OptionValue = string | number;
export type FormValues = Record<string, unknown>;

export interface FormSchema {
  schemaVersion: 1;
  id: string;
  title?: string;
  fields: Field[];
}

export interface BaseField {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  helpText?: string;
}

export interface StringValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface NumericValidation {
  min?: number;
  max?: number;
  step?: number;
}

export interface TemporalValidation {
  min?: string;
  max?: string;
}

export interface AssetValidation {
  accept?: string[];
  maxSizeBytes?: number;
}

export interface TextField extends BaseField {
  type: 'text';
  defaultValue?: string;
  placeholder?: string;
  validation?: StringValidation;
}

export interface TextareaField extends BaseField {
  type: 'textarea';
  defaultValue?: string;
  placeholder?: string;
  validation?: StringValidation;
}

export interface NumberField extends BaseField {
  type: 'number';
  defaultValue?: number | '';
  placeholder?: string;
  validation?: NumericValidation;
}

export interface CurrencyField extends BaseField {
  type: 'currency';
  defaultValue?: number | '';
  placeholder?: string;
  currencyCode?: string;
  validation?: NumericValidation;
}

export interface CheckboxField extends BaseField {
  type: 'checkbox';
  defaultValue?: boolean;
}

export interface ConditionalOption {
  label: string;
  value: OptionValue;
  fields?: Field[];
}

export interface SimpleOption {
  label: string;
  value: OptionValue;
}

export interface SelectField extends BaseField {
  type: 'select';
  defaultValue?: OptionValue | '';
  placeholder?: string;
  options: ConditionalOption[];
}

export interface RadioField extends BaseField {
  type: 'radio';
  defaultValue?: OptionValue | '';
  options: ConditionalOption[];
}

export interface MultiselectField extends BaseField {
  type: 'multiselect';
  defaultValue?: OptionValue[];
  placeholder?: string;
  options: SimpleOption[];
}

export interface DateField extends BaseField {
  type: 'date';
  defaultValue?: string;
  validation?: TemporalValidation;
}

export interface TimeField extends BaseField {
  type: 'time';
  defaultValue?: string;
  validation?: TemporalValidation;
}

export interface DatetimeField extends BaseField {
  type: 'datetime';
  defaultValue?: string;
  validation?: TemporalValidation;
}

export interface RemoteAssetValue {
  kind: 'remote';
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

export interface LocalFileValue {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
}

export type AssetValue = RemoteAssetValue | LocalFileValue | null;

export interface FileField extends BaseField {
  type: 'file';
  defaultValue?: RemoteAssetValue | null;
  validation?: AssetValidation;
}

export interface ImageField extends BaseField {
  type: 'image';
  defaultValue?: RemoteAssetValue | null;
  validation?: AssetValidation;
}

export type CalculationOperation = 'add' | 'subtract';

export interface CalculationStep {
  operation: CalculationOperation;
  field: string;
}

export interface CalculationDefinition {
  initialField: string;
  steps: CalculationStep[];
}

export interface CalculationField extends BaseField {
  type: 'calculation';
  calculation: CalculationDefinition;
}

export type Field =
  | TextField
  | TextareaField
  | NumberField
  | CurrencyField
  | CheckboxField
  | SelectField
  | RadioField
  | MultiselectField
  | DateField
  | TimeField
  | DatetimeField
  | FileField
  | ImageField
  | CalculationField;

