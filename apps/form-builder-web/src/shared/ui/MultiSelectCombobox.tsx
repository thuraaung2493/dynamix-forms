import { Combobox } from '@base-ui/react/combobox';
import type { OptionValue } from '@thuraaung2493/dynamic-form-core';
import { Check, ChevronDown, X } from 'lucide-react';
import { useRef } from 'react';

interface Option {
  label: string;
  value: OptionValue;
}

interface MultiSelectComboboxProps {
  options: readonly Option[];
  value: readonly OptionValue[];
  onChange: (value: OptionValue[]) => void;
  onBlur: () => void;
  id: string;
  label: string;
  describedBy?: string | undefined;
  placeholder?: string | undefined;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  required?: boolean;
}

// Adapted from shadcn/ui's Base UI combobox composition to the app's theme.
// https://ui.shadcn.com/docs/components/base/combobox#multiple-selection
export function MultiSelectCombobox({
  options, value, onChange, onBlur, id, label, describedBy, placeholder,
  disabled = false, readOnly = false, invalid = false, required = false,
}: MultiSelectComboboxProps) {
  const anchor = useRef<HTMLDivElement>(null);
  const selected = value.flatMap((entry) => {
    const option = options.find((candidate) => candidate.value === entry);
    return option ? [option] : [];
  });

  return (
    <Combobox.Root
      multiple
      items={options}
      value={selected}
      disabled={disabled}
      readOnly={readOnly}
      onOpenChange={(open, details) => { if (open && readOnly) details.cancel(); }}
      isItemEqualToValue={(item, selection) => item.value === selection.value}
      itemToStringLabel={(item) => item.label}
      onValueChange={(next, details) => {
        // Escape dismisses suggestions without discarding the user's selections.
        if (details.reason === 'escape-key') { details.cancel(); return; }
        onChange(next.map((item) => item.value));
      }}
    >
      <Combobox.Chips className="multi-combobox" ref={anchor} data-disabled={disabled || undefined}>
        <Combobox.Value>
          {selected.map((item) => (
            <Combobox.Chip className="multi-combobox__chip" key={`${typeof item.value}:${item.value}`}>
              <span>{item.label}</span>
              {!readOnly && (
                <Combobox.ChipRemove className="multi-combobox__remove" aria-label={`Remove ${item.label}`} disabled={disabled}>
                  <X size={14} aria-hidden="true" />
                </Combobox.ChipRemove>
              )}
            </Combobox.Chip>
          ))}
        </Combobox.Value>
        <Combobox.Input
          id={id}
          className="multi-combobox__input"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          placeholder={placeholder ?? 'Search and select…'}
          onBlur={onBlur}
        />
        <Combobox.Trigger className="multi-combobox__trigger" aria-label={`Show ${label} options`} disabled={disabled || readOnly}>
          <ChevronDown size={16} aria-hidden="true" />
        </Combobox.Trigger>
      </Combobox.Chips>
      <Combobox.Portal>
        <Combobox.Positioner className="multi-combobox__positioner" anchor={anchor} sideOffset={6} align="start">
          <Combobox.Popup className="multi-combobox__popup">
            <Combobox.Empty className="multi-combobox__empty">No options found.</Combobox.Empty>
            <Combobox.List className="multi-combobox__list">
              {(item: Option) => (
                <Combobox.Item className="multi-combobox__item" key={`${typeof item.value}:${item.value}`} value={item}>
                  <span>{item.label}</span>
                  <Combobox.ItemIndicator><Check size={16} aria-hidden="true" /></Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
