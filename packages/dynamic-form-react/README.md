# `@thuraaung2493/dynamic-form-react`

Render JSON form schemas in React. The package supplies validation and form state, while your app chooses where submissions go and how controls look.

## Installation

```bash
npm install @thuraaung2493/dynamic-form-core@beta @thuraaung2493/dynamic-form-react@beta react react-dom
```

Use the `beta` tags to explicitly install the `0.1.0-beta.0` prereleases. Because these are the packages' first releases, npm also points `latest` at them until stable releases are published; unqualified installs currently get the betas too.

The package supports React 18.2 and React 19. Import the default styles once near the root of your application:

```tsx
import '@thuraaung2493/dynamic-form-react/styles.css';
```

These styles apply only to the package's `df-native` and `df-bootstrap` classes. You may omit them if you supply your own styles.

When working directly in this monorepo, run `npm install` at the repository root, then build both packages:

```bash
npm run build --workspace @thuraaung2493/dynamic-form-core
npm run build --workspace @thuraaung2493/dynamic-form-react
```

To try the packages in a separate app before publishing, pack both workspaces from the repository root and install the resulting archives in that app:

```bash
npm pack --workspace @thuraaung2493/dynamic-form-core
npm pack --workspace @thuraaung2493/dynamic-form-react
# From the separate app, use the full paths to the two .tgz files:
npm install /path/to/thuraaung2493-dynamic-form-core-0.1.0-beta.0.tgz /path/to/thuraaung2493-dynamic-form-react-0.1.0-beta.0.tgz
```

## Quick start

```tsx
import type { FormSchema } from '@thuraaung2493/dynamic-form-core';
import { DynamicForm } from '@thuraaung2493/dynamic-form-react';
import '@thuraaung2493/dynamic-form-react/styles.css';

const schema: FormSchema = {
  schemaVersion: 1,
  id: 'contact-request',
  title: 'Contact request',
  fields: [
    { name: 'name', type: 'text', label: 'Name', required: true },
    {
      name: 'contact_method',
      type: 'select',
      label: 'Contact method',
      options: [
        { label: 'Email', value: 'email' },
        {
          label: 'Phone',
          value: 'phone',
          fields: [
            {
              name: 'phone_number',
              type: 'text',
              label: 'Phone number',
              required: true,
            },
          ],
        },
      ],
    },
  ],
};

export function ContactForm() {
  return (
    <DynamicForm
      schema={schema}
      submitLabel="Show values"
      onSubmit={async (values) => {
        console.log(values);
      }}
    />
  );
}
```

Render `<ContactForm />` and submit it to see the values in your browser console. Choose Phone to reveal a required phone number field. The default controls support all 14 field types, including nested conditions and calculations.

To send the values to your API, replace the `onSubmit` handler. Check the HTTP status so server errors reach `onSubmitError`:

```tsx
<DynamicForm
  schema={schema}
  onSubmit={async (values) => {
    const response = await fetch('/api/contact-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) throw new Error(`Save failed: ${response.status}`);
  }}
  onSubmitError={(error) => console.error(error)}
/>;
```

If the form includes a newly selected file, `values` contains a browser `File`. Upload it separately or use `FormData`; `JSON.stringify` cannot send file contents. See [File and image values](#file-and-image-values).

Changing a conditional option does not erase previous input in that option's fields. By default, submission includes only fields active under the selected options and skips fields marked `disabled` in the schema. Read-only and calculated values are included while active. For example, if the user enters a phone number and then chooses Email, `phone_number` stays in form state but is left out of `onSubmit`.

## Supported fields

Set a field's `type` in the schema to choose its default control. These are the controls rendered by the built-in `nativeAdapter` and `bootstrapAdapter`:

| Schema `type` | Default control | Submitted value | Example use |
| --- | --- | --- | --- |
| `text` | Single-line text `<input>` | `string` | Name |
| `textarea` | Multiline `<textarea>` | `string` | Comments |
| `number` | Number `<input>` | `number` or `''` | Age |
| `currency` | Number `<input>` | `number` or `''` | Price; `currencyCode` is schema metadata, not a formatted currency control. |
| `checkbox` | Checkbox `<input>` | `boolean` | Agreement |
| `select` | Single-choice `<select>` | An option's string or number value, or `''` | Country; options can reveal child fields. |
| `radio` | Radio buttons | An option's string or number value, or `''` | Delivery method; options can reveal child fields. |
| `multiselect` | Multiple-choice `<select multiple>` | Array of option values | Interests; use a custom renderer for a combobox. |
| `date` | Date `<input>` | `string` | Birth date |
| `time` | Time `<input>` | `string` | Appointment time |
| `datetime` | Local date and time `<input type="datetime-local">` | `string` | Appointment date and time |
| `file` | File `<input>` | Browser `File`, remote asset, or `null` | Attachment |
| `image` | File `<input>` with image preview | Browser `File`, remote asset, or `null` | Profile photo |
| `calculation` | Read-only `<output>` | Computed `number` or `null` | Total |

For example, add these objects to a schema's `fields` array:

```ts
[
  { name: 'email', type: 'text', label: 'Email', required: true },
  { name: 'message', type: 'textarea', label: 'Message' },
  {
    name: 'priority',
    type: 'select',
    label: 'Priority',
    options: [
      { label: 'Normal', value: 'normal' },
      { label: 'Urgent', value: 'urgent' },
    ],
  },
  {
    name: 'topics',
    type: 'multiselect',
    label: 'Topics',
    options: [
      { label: 'Billing', value: 'billing' },
      { label: 'Support', value: 'support' },
    ],
  },
]
```

For schema properties and validation options for each type, see the `@thuraaung2493/dynamic-form-core` README. In this repository, it is at `packages/dynamic-form-core/README.md`.

## Do and don't: using `DynamicForm`

| Do | Don't |
| --- | --- |
| Validate or parse JSON schemas from users or APIs before rendering them. | Assume imported JSON matches `FormSchema` because your variable has that TypeScript type. |
| Handle failed requests in `onSubmit` and show the error through `onSubmitError` or your own UI. | Assume `fetch` rejects automatically for HTTP 4xx or 5xx responses. |
| Use `FormData` or a separate upload request for new browser `File` values. | Send file contents with `JSON.stringify(values)`. |
| Change `reinitializeKey` or call `reset` when you intend to replace edited values. | Expect a change to `initialData` alone to reset the form. |

## `DynamicForm` props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `schema` | `FormSchema` | required | Valid v1 schema to render. Parse untrusted JSON with `parseFormSchema` first. |
| `onSubmit` | `(values) => Promise<TResult>` | required | Receives the prepared active-field payload after validation succeeds. |
| `initialData` | `FormValues` | Schema defaults | Known field values to merge over schema defaults. |
| `reinitializeKey` | `string \| number` | — | Change this value to reset the form from the current `initialData`. |
| `adapter` | `DynamicFormAdapter` | `nativeAdapter` | Replaces the form shell, field shell, submit button, and fallback field renderer. |
| `customRenderers` | `CustomFieldRenderers` | — | Overrides controls by field name or field type. |
| `externalValidator` | `AsyncValueValidator` | — | Adds synchronous or asynchronous validation issues. |
| `onSubmitError` | `(error) => void` | — | Handles an error thrown or rejected by `onSubmit`. |
| `submitLabel` | `string` | `"Submit"` | Submit-button label. |
| `className` | `string` | — | Passed to the adapter’s form component. |
| `disabled` | `boolean` | `false` | Disables every control and the submit button. |

Changing `initialData` alone does not replace edits already made by the user. Change `reinitializeKey`, remount the component, or use `useDynamicForm().reset(nextData)` when you intentionally want to reset values.

For an edit form, pass the saved values as `initialData`. The user can then change fields normally; `onSubmit` receives the edited, validated values. See [Load and update an existing form](#load-and-update-an-existing-form) for a complete example.

The examples below reuse `schema` from the quick start. Where they show `saveForm`, supply your own async function such as `(values) => fetch(...)` from the API example above.

Choose the smallest customization that fits your form:

| What you want | Use |
| --- | --- |
| Standard controls | `DynamicForm` with its default `nativeAdapter` |
| Change one named field | `customRenderers.byName` |
| Change every field of a type | `customRenderers.byType` |
| Change labels, layout, errors, buttons, and fallback controls | A full `DynamicFormAdapter` |
| Build the entire form UI yourself | `useDynamicForm` |

## Built-in adapters

`nativeAdapter` is the default. `bootstrapAdapter` uses a separate set of Bootstrap-like class names but does not install or require Bootstrap:

```tsx
import {
  bootstrapAdapter,
  DynamicForm,
} from '@thuraaung2493/dynamic-form-react';

<DynamicForm
  adapter={bootstrapAdapter}
  className="my-form"
  schema={schema}
  onSubmit={saveForm}
/>;
```

Both built-in adapters use the optional package stylesheet. Choose `customRenderers` when only some controls need to change. Choose a full adapter when the surrounding form and field layout must also change.

## Custom field renderers

A custom field renderer replaces the input control. The adapter still renders its label, help text, errors, and submit button. Start here when you want a different input for one field or one field type.

Renderer selection follows this order:

1. `customRenderers.byName[field.name]`
2. `customRenderers.byType[field.type]`
3. `adapter.FieldRenderer`

For example, `byType.multiselect` can use a combobox for all multi-select fields, while `byName.services` can give one field a special control. The name-specific renderer wins when both match.

### Renderer props

Every custom renderer receives `FieldRendererProps`:

| Prop | Meaning |
| --- | --- |
| `field` | The complete field definition. Narrow on `field.type` before reading type-specific properties. |
| `value` | Current value for this field. It is `unknown` because the renderer contract covers every field type. |
| `values` | Current values for the whole form, including values retained in inactive branches. Useful for dependent UI. |
| `onChange(value)` | Stores a raw value and immediately recalculates calculation fields. |
| `onBlur()` | Marks the field touched and validates it. Call this when focus leaves the control. |
| `inputId` | ID for the control. Use it so the adapter’s `<label>` points to the correct element. |
| `describedBy` | IDs for help text and visible errors. Pass it to `aria-describedby`. |
| `disabled` | `true` when the whole form or this field is disabled. |
| `readOnly` | `true` for schema read-only fields and calculation fields. |
| `errors` | Current validation messages for the field. |
| `touched` | Whether the user blurred the field or attempted submission. |
| `depth` | `0` for root fields; larger values represent conditional nesting. |

A renderer is responsible for the value shape expected by the schema:

| Field type | Value passed to `onChange` |
| --- | --- |
| `text`, `textarea`, `date`, `time`, `datetime` | `string` |
| `number`, `currency` | `number` or `''` for empty input |
| `checkbox` | `boolean` |
| `select`, `radio` | The option’s original `string \| number` value, or `''` when cleared |
| `multiselect` | Array of original option values |
| `file`, `image` | Browser `File`, persisted `RemoteAssetValue`, or `null` |
| `calculation` | Read-only computed `number \| null`; do not call `onChange` |

Preserve option value types. The string value `'1'` and numeric value `1` are different options.

### Do and don't: custom renderers

| Do | Don't |
| --- | --- |
| Call `onChange` with the value type shown above and call `onBlur` when the user leaves the control. | Convert every option value to a string or skip blur handling. |
| Pass `inputId`, `describedBy`, `disabled`, and `readOnly` to the underlying control where applicable. | Drop label and error connections when replacing a control. |
| Let `DynamicForm` render the active child fields for custom `select` and `radio` controls. | Render `option.fields` inside the custom control; that duplicates the nested fields. |
| Use `byName` for one field, `byType` for a field type, and an adapter for the whole form layout. | Replace the full adapter just to change a single input. |

### Replace every field of one type

This example renders every textarea with an application component:

```tsx
import type { FieldRendererProps } from '@thuraaung2493/dynamic-form-react';
import { DynamicForm } from '@thuraaung2493/dynamic-form-react';

function TextareaRenderer({
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
}: FieldRendererProps) {
  if (field.type !== 'textarea') return null;

  return (
    <textarea
      id={inputId}
      name={field.name}
      aria-describedby={describedBy}
      aria-invalid={touched && errors.length > 0}
      disabled={disabled}
      readOnly={readOnly}
      required={field.required}
      placeholder={field.placeholder}
      maxLength={field.validation?.maxLength}
      value={typeof value === 'string' ? value : ''}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

<DynamicForm
  schema={schema}
  customRenderers={{ byType: { textarea: TextareaRenderer } }}
  onSubmit={saveForm}
/>;
```

The type guard tells TypeScript that this field has textarea properties such as `placeholder` and `validation.maxLength`.

### Replace one field by name

Use `byName` when one field needs unique behavior without changing other fields of the same type:

```tsx
import type { FieldRendererProps } from '@thuraaung2493/dynamic-form-react';

function AccountCodeRenderer(props: FieldRendererProps) {
  const { field, value, onChange, onBlur, inputId, describedBy, disabled, readOnly } = props;
  if (field.type !== 'text') return null;

  return (
    <input
      id={inputId}
      name={field.name}
      aria-describedby={describedBy}
      aria-invalid={props.touched && props.errors.length > 0}
      disabled={disabled}
      readOnly={readOnly}
      required={field.required}
      value={typeof value === 'string' ? value : ''}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value.toUpperCase())}
    />
  );
}

// The schema must contain a text field named account_code.
<DynamicForm
  schema={schema}
  customRenderers={{ byName: { account_code: AccountCodeRenderer } }}
  onSubmit={saveForm}
/>;
```

If `account_code` is also a `text` field and both `byName.account_code` and `byType.text` exist, the name-specific renderer wins.

### Custom multi-select example

The package’s native renderer uses `<select multiple>`. Applications can provide a combobox, chip picker, or checkbox group without changing the schema or form engine:

```tsx
import type { OptionValue } from '@thuraaung2493/dynamic-form-core';
import type { FieldRendererProps } from '@thuraaung2493/dynamic-form-react';

function CheckboxMultiselect({
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
}: FieldRendererProps) {
  if (field.type !== 'multiselect') return null;

  const selected: OptionValue[] = Array.isArray(value)
    ? value.filter(
        (item): item is OptionValue =>
          typeof item === 'string' || typeof item === 'number',
      )
    : [];

  const toggle = (optionValue: OptionValue, checked: boolean) => {
    onChange(
      checked
        ? [...selected, optionValue]
        : selected.filter((item) => item !== optionValue),
    );
  };

  return (
    <div
      id={inputId}
      role="group"
      aria-describedby={describedBy}
      aria-invalid={touched && errors.length > 0}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur();
      }}
    >
      {field.options.map((option) => (
        <label key={`${typeof option.value}:${String(option.value)}`}>
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            disabled={disabled || readOnly}
            onChange={(event) => toggle(option.value, event.target.checked)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

<DynamicForm
  schema={schema}
  customRenderers={{ byType: { multiselect: CheckboxMultiselect } }}
  onSubmit={saveForm}
/>;
```

For a combobox with chips, use the same `byType.multiselect` registration. Keep its selected value as an array of the original option values; do not convert numeric options to strings. Call `onBlur` when focus leaves the whole combobox, rather than when it moves between its input, list, and chips. The monorepo also contains a working Base UI example at `apps/form-builder-web/src/shared/ui/MultiSelectCombobox.tsx`.

### Conditional select or radio renderers

`DynamicForm` renders nested fields automatically. A custom `select` or `radio` renderer only needs to send the selected option’s original `value` through `onChange`. Use real radio inputs for keyboard navigation:

```tsx
import type { FieldRendererProps } from '@thuraaung2493/dynamic-form-react';

function SegmentedRadio({ field, value, onChange, onBlur, disabled, readOnly, describedBy, inputId }: FieldRendererProps) {
  if (field.type !== 'radio') return null;

  return (
    <div role="radiogroup" aria-describedby={describedBy}>
      {field.options.map((option, index) => (
        <label key={`${typeof option.value}:${String(option.value)}`}>
          <input
            id={index === 0 ? inputId : undefined}
            type="radio"
            name={field.name}
            checked={value === option.value}
            disabled={disabled || readOnly}
            onBlur={onBlur}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
```

Do not render `option.fields` inside the custom control. The form renderer owns recursion and displays the matching branch after the control.

## Full UI adapters

Use `createShadcnAdapter` to render the whole form with components generated in your application by shadcn/ui. The helper wires values, option lists, labels, help text, errors, and the submit button. You provide the components once.

```tsx
import { createShadcnAdapter, DynamicForm } from '@thuraaung2493/dynamic-form-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MultiselectField } from './MultiselectField';

const adapter = createShadcnAdapter({
  components: {
    Button, Checkbox, Input, Label, RadioGroup, RadioGroupItem,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea,
  },
  renderers: { multiselect: MultiselectField },
});

<DynamicForm adapter={adapter} schema={schema} onSubmit={saveForm} />;
```

These imports refer to components generated in **your app**. The package does not install or bundle shadcn/ui. Change the `@/` alias to match your project.

The example uses shadcn/ui **Base UI**, the default. If your generated components use Radix UI, add `variant: 'radix'` to the options. The adapter handles the different select and radio APIs. Both variants preserve original numeric or string option values and render conditional child fields.

| Schema fields | Control |
| --- | --- |
| `text`, `number`, `currency`, `date`, `time`, `datetime`, `file`, `image` | Your shadcn `Input` |
| `textarea` | Your shadcn `Textarea` |
| `checkbox` | Your shadcn `Checkbox` |
| `select` | Your shadcn `Select` components |
| `radio` | Your shadcn `RadioGroup` components |
| `multiselect` | Your app's `MultiselectField` renderer |
| `calculation` | A read-only HTML `output` element |

**Multiselect is required.** shadcn/ui has no single standard multiselect component, so the helper never substitutes a native `<select multiple>`. Build `MultiselectField` with your app's combobox and accept `FieldRendererProps`. Pass `field.options` as choices, an array of original option values to `onChange`, and call `onBlur` when the whole control loses focus. Forward `inputId`, `describedBy`, `disabled`, `readOnly`, and the error state. See the [Base UI combobox multiple-selection guide](https://ui.shadcn.com/docs/components/base/combobox#multiple-selection) and the monorepo's `apps/form-builder-web/src/shared/ui/MultiSelectCombobox.tsx` for a working control.

For example, if your app has a `MultiSelectCombobox` with the props shown in that monorepo example, the renderer is only a small bridge:

```tsx
import type { FieldRendererProps } from '@thuraaung2493/dynamic-form-react';
import { MultiSelectCombobox } from './MultiSelectCombobox';

export function MultiselectField(props: FieldRendererProps) {
  if (props.field.type !== 'multiselect') return null;

  const selected = props.field.options
    .filter((option) => Array.isArray(props.value) && props.value.includes(option.value))
    .map((option) => option.value);

  return (
    <MultiSelectCombobox
      options={props.field.options}
      value={selected}
      onChange={props.onChange}
      onBlur={props.onBlur}
      id={props.inputId}
      label={props.field.label}
      describedBy={props.describedBy}
      placeholder={props.field.placeholder}
      disabled={props.disabled}
      readOnly={props.readOnly}
      invalid={props.touched && props.errors.length > 0}
      required={props.field.required}
    />
  );
}
```

`customRenderers.byName` and `customRenderers.byType` still override an adapter control. If you need complete control over the form shell as well, the original `createShadcnAdapter({ Form, Field, SubmitButton, FieldRenderer })` signature remains available.

## Using `useDynamicForm` directly

Use the hook when your application needs complete control over markup or has a UI system whose form architecture does not fit the adapter contract.

```tsx
import { useDynamicForm } from '@thuraaung2493/dynamic-form-react';

function HeadlessExample() {
  const form = useDynamicForm({
    schema,
    initialData: { name: 'Jane' },
    externalValidator: async ({ values }) => {
      if (values.name === 'Admin') {
        return [{
          code: 'custom',
          fieldName: 'name',
          message: 'This name is reserved.',
        }];
      }
      return [];
    },
  });

  return (
    <form onSubmit={form.handleSubmit(async (values) => saveForm(values))}>
      <input
        value={typeof form.values.name === 'string' ? form.values.name : ''}
        onChange={(event) => form.setValue('name', event.target.value)}
        onBlur={() => {
          form.setTouched('name');
          void form.validateField('name');
        }}
      />
      {form.touched.name && form.errors.name?.map((error) => (
        <p key={error}>{error}</p>
      ))}
      <button
        type="button"
        onClick={() => form.setValue('name', 'Jane', { touch: true })}
      >
        Use Jane
      </button>
      <button disabled={form.isValidating} type="submit">Save</button>
    </form>
  );
}
```

The returned state contains:

- `values`, `errors`, and `touched`
- `isDirty`, `isValid`, and `isValidating`
- `setValue`, `setValues`, and `setTouched`
- `validate` and `validateField`
- `reset` and `getValues`
- `handleSubmit`

With a UI built from `useDynamicForm`, use `form.setValue('name', 'Jane', { touch: true })` to change one field, `form.setValues({ name: 'Jane', contact_method: 'email' })` to change several, or `form.reset({ name: 'Jane' })` to replace the form's starting values. `getValues()` returns the normal active, non-disabled submission payload. Pass core `PrepareSubmissionOptions` to include inactive or disabled fields explicitly.

`<DynamicForm>` creates its **own** `useDynamicForm` state. Calling `useDynamicForm` beside it creates a second, independent form. To replace values shown by `<DynamicForm>`, change `initialData` **and** `reinitializeKey`; this discards unsaved edits. To set individual values directly, build the UI with `useDynamicForm` instead.

## Load and update an existing form

| Hook | With `<DynamicForm>`? | Use it for |
| --- | --- | --- |
| `useFormData` | Yes | Loading a schema or saved field values. |
| `useFormSubmit` | Yes, when needed | Showing a save result, success, or error outside the form. |
| `useDynamicForm` | Use separately | Building your own form UI and changing individual field values. `<DynamicForm>` already uses it internally. |

The example below assumes your app has an API that returns `{ values }` for an existing contact. It uses `schema` from the quick start. The separate `dynamix-forms-demo` app saves records in page memory instead of calling this API.

```tsx
import { useCallback } from 'react';
import type { FormValues } from '@thuraaung2493/dynamic-form-core';
import { DynamicForm, useFormData, useFormSubmit } from '@thuraaung2493/dynamic-form-react';

type SavedContact = {
  values: FormValues;
};

function EditContactForm({ id }: { id: string }) {
  const loadContact = useCallback(async (signal: AbortSignal): Promise<SavedContact> => {
    const response = await fetch(`/api/contact-requests/${id}`, { signal });
    if (!response.ok) throw new Error(`Load failed: ${response.status}`);
    return response.json() as Promise<SavedContact>;
  }, [id]);

  const updateContact = useCallback(async (values: FormValues): Promise<void> => {
    const response = await fetch(`/api/contact-requests/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) throw new Error(`Update failed: ${response.status}`);
  }, [id]);

  const loaded = useFormData(loadContact);
  const save = useFormSubmit(updateContact);

  if (loaded.isLoading) return <p>Loading…</p>;
  if (loaded.error) return <p>Could not load the contact.</p>;
  if (!loaded.data) return <p>Contact not found.</p>;

  return (
    <>
      <DynamicForm
        schema={schema}
        initialData={loaded.data.values}
        onSubmit={save.submit}
        submitLabel="Save changes"
      />
      {save.success && <p role="status">Last save succeeded.</p>}
      {save.error && <p role="alert">Last save failed.</p>}
    </>
  );
}

// Remount when the parent switches to a different contact.
export function ContactEditPage({ id }: { id: string }) {
  return <EditContactForm key={id} id={id} />;
}
```

Here is what happens:

1. `useFormData(loadContact)` fetches the saved record. `loaded.data.values` contains its current field values.
2. `initialData={loaded.data.values}` fills the form when it appears. You do not need an `onChange` handler for every field; `<DynamicForm>` manages edits itself.
3. When the user clicks **Save changes**, `<DynamicForm>` validates the form and calls `save.submit` with the edited values.
4. `updateContact` sends those values in a `PATCH` request. `useFormSubmit` provides `save.success` or `save.error` for the message below the form.

For example, if the API loads `full_name: "Jane Doe"` and the user types `"Jane Smith"`, the `values` passed to `updateContact` contain `full_name: "Jane Smith"`. The parent component does not need to read the input while the user types. `ContactEditPage` uses `key={id}` so opening a different contact starts with that contact's values and fresh loading and save status.

The form keeps showing the user's edited values after a successful save. `initialData` is a starting value, not a live connection to the server. If your API changes values during saving and you want to display those returned values, refetch the record and pass a changing server `revision` or `updatedAt` as `reinitializeKey`. That resets the form to the new `initialData` and discards any unsaved edits.

By default, `onSubmit` includes only active, enabled fields. If your API keeps omitted fields, the `PATCH` request can preserve values in inactive conditional branches. New browser `File` values need an upload flow rather than `JSON.stringify`; see [File and image values](#file-and-image-values).

`useFormData` returns `data`, `isLoading`, `error`, and `refetch`; it aborts obsolete requests. Keep its loader stable with `useCallback`. `useFormSubmit` returns `submit`, `isSubmitting`, `error`, `success`, `data`, and `resetStatus`. `<DynamicForm>` already manages its submit button state, so use the outer `useFormSubmit` when the page also needs the save result, success message, or error state.

The submit hook records an error and also rejects its `submit` promise. `<DynamicForm>` catches that rejection, so the `save.error` message above can be shown safely. When you submit directly from your own button, catch the rejection yourself. If you do not need a success or error message outside the form, pass `updateContact` directly to `onSubmit` and use `onSubmitError` for failures.

## File and image values

Persisted files and images use the core `RemoteAssetValue` representation:

```ts
const existingImage = {
  kind: 'remote' as const,
  url: 'https://cdn.example.com/avatar.jpg',
  name: 'avatar.jpg',
  mimeType: 'image/jpeg',
};
```

Newly selected files remain browser `File` objects. Uploading a file, replacing a remote asset, converting it to an API payload, and revoking server-side files are responsibilities of the consuming application.

## Exports

The package exports `DynamicForm`, `useDynamicForm`, `useFormData`, `useFormSubmit`, `nativeAdapter`, `bootstrapAdapter`, `createShadcnAdapter`, and all public renderer, adapter, hook, and state types.

Schema types, parsing, traversal, calculations, value validation, and submission preparation come from `@thuraaung2493/dynamic-form-core`. Its README is in `packages/dynamic-form-core/README.md` in this repository.

## License

MIT
