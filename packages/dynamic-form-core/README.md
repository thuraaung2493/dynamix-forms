# `@thuraaung2493/dynamic-form-core`

Define and validate a form without depending on React or a particular UI. This package handles schemas, default values, calculations, conditions, and submission values.

```bash
npm install @thuraaung2493/dynamic-form-core@beta
```

Use the `beta` tag to explicitly install the `0.1.0-beta.0` prerelease. Because this is the package's first release, npm also points `latest` at this version until a stable release is published; an unqualified install currently gets the beta too.

## Schema

Schemas use the versioned public format:

```ts
import type { FormSchema } from '@thuraaung2493/dynamic-form-core';

const schema: FormSchema = {
  schemaVersion: 1,
  id: 'profit-assessment',
  title: 'Profit assessment',
  fields: [
    { name: 'income', type: 'currency', label: 'Income', required: true },
    { name: 'expenses', type: 'currency', label: 'Expenses' },
    {
      name: 'profit',
      type: 'calculation',
      label: 'Profit',
      calculation: {
        initialField: 'income',
        steps: [{ operation: 'subtract', field: 'expenses' }],
      },
    },
  ],
};
```

Supported v1 types are `text`, `textarea`, `number`, `currency`, `checkbox`, `select`, `radio`, `multiselect`, `date`, `time`, `datetime`, `file`, `image`, and `calculation`.

Only `select` and `radio` options can have child fields. Each field name must be unique across the whole form, including fields in different branches. A full JSON example is available at `examples/sample-customer-intake.json` in this repository.

### Field reference

All fields require `name`, `type`, and `label`. They may also specify `required`, `disabled`, `readOnly`, and `helpText`.

| Type | Value | Type-specific properties |
| --- | --- | --- |
| `text` | `string` | `defaultValue`, `placeholder`, `validation.minLength`, `validation.maxLength`, `validation.pattern` |
| `textarea` | `string` | Same text properties; intended for multiple lines. |
| `number` | `number \| ''` | `defaultValue`, `placeholder`, `validation.min`, `validation.max`, `validation.step` |
| `currency` | `number \| ''` | Number properties plus optional `currencyCode` |
| `checkbox` | `boolean` | `defaultValue` |
| `select` | option `string \| number`, or `''` | `defaultValue`, `placeholder`, conditional `options` |
| `radio` | option `string \| number`, or `''` | `defaultValue`, conditional `options` |
| `multiselect` | `(string \| number)[]` | `defaultValue`, `placeholder`, simple `options` |
| `date` | `string` | `defaultValue`, `validation.min`, `validation.max` |
| `time` | `string` | `defaultValue`, `validation.min`, `validation.max` |
| `datetime` | `string` | `defaultValue`, `validation.min`, `validation.max` |
| `file` | local file, remote asset, or `null` | `defaultValue`, `validation.accept`, `validation.maxSizeBytes` |
| `image` | local file, remote asset, or `null` | Same file properties; intended for images. |
| `calculation` | computed `number \| null` | `calculation.initialField`, `calculation.steps` |

Option values are compared with strict equality. Numeric `1` and string `'1'` are distinct values.

### Conditional fields

Add `fields` to a `select` or `radio` option. Those fields appear and are validated only when the user selects that option:

```ts
const conditionalSchema: FormSchema = {
  schemaVersion: 1,
  id: 'delivery',
  fields: [
    {
      name: 'delivery_method',
      type: 'radio',
      label: 'Delivery method',
      required: true,
      options: [
        { label: 'Collect', value: 'collect' },
        {
          label: 'Ship',
          value: 'ship',
          fields: [
            {
              name: 'shipping_address',
              type: 'textarea',
              label: 'Shipping address',
              required: true,
            },
          ],
        },
      ],
    },
  ],
};
```

Conditions may nest recursively. A field name must still be unique across the complete schema, including branches that cannot be active at the same time.

### Do and don't: schemas

| Do | Don't |
| --- | --- |
| Give every field a unique `name`, including fields in different conditional branches. | Reuse a name because two branches cannot appear together. |
| Use `select` or `radio` option `fields` for conditional questions. | Put child `fields` on a `multiselect` option; it does not support conditional children. |
| Keep option value types consistent with the values you set or restore. | Assume numeric `1` and string `'1'` select the same option. |
| Parse imported or otherwise untrusted schemas with `parseFormSchema` before using them. | Treat a TypeScript type annotation as validation of JSON received at runtime. |

## Validation

Use `validateFormSchema` when you want to display all schema errors in an editor. Use `parseFormSchema` when invalid input should stop processing. Both reject unknown properties. Calculations may refer only to number, currency, or other calculation fields, and cycles are rejected.

```ts
import {
  parseFormSchema,
  validateFormSchema,
} from '@thuraaung2493/dynamic-form-core';

function inspectPastedSchema(json: string) {
  const input: unknown = JSON.parse(json);
  const result = validateFormSchema(input);
  return result.issues; // Each issue has a path and message.
}

function loadPastedSchema(json: string) {
  const input: unknown = JSON.parse(json);
  return parseFormSchema(input); // Throws SchemaValidationError when invalid.
}
```

`validateFormSchema` returns all issues so an editor can display them. `parseFormSchema` returns a typed `FormSchema` or throws `SchemaValidationError`; catch it and read `error.issues` if you need details. `JSON.parse` can also throw `SyntaxError` for malformed JSON.

## Initial values and calculations

```ts
import { createInitialValues } from '@thuraaung2493/dynamic-form-core';

const values = createInitialValues(schema, {
  income: 1200,
  expenses: 400,
});
// values.profit === 800
```

Defaults are generated for all fields, including fields in inactive branches. Existing data overrides defaults for known non-calculated fields. Calculated values are always recomputed instead of trusting stored values.

For calculations, missing, empty, and `null` numeric inputs are treated as zero. Numeric strings are accepted. Other nonnumeric values produce a calculation issue and a `null` result.

## Active fields and submission

```ts
import { prepareSubmission } from '@thuraaung2493/dynamic-form-core';

const activePayload = prepareSubmission(schema, values);
const payloadIncludingHidden = prepareSubmission(conditionalSchema, {
  delivery_method: 'collect',
  shipping_address: 'Saved from an earlier choice',
}, {
  includeInactive: true,
});
// The default payload for that example omits shipping_address.
// payloadIncludingHidden includes it because includeInactive is true.
```

The default payload contains only active, non-disabled fields. Use `{ includeInactive: true }` to include hidden branch values, or `{ includeDisabled: true }` to include fields marked `disabled` in the schema. Read-only and calculated values are included while active. Unknown keys are never copied.

### Do and don't: submissions

| Do | Don't |
| --- | --- |
| Use `prepareSubmission(schema, values)` for the normal active-field payload. | Send the entire form state when hidden answers should be excluded. |
| Set `includeInactive: true` only when your application needs hidden branch values. | Expect a previously entered hidden value to be erased when its branch closes. |
| Let the package recalculate calculation fields from their sources. | Trust a stored calculation value as the current result. |

## Runtime value validation

Built-in validation checks required values, lengths, patterns, numeric bounds and steps, option values, dates and times, file constraints, active conditional fields, and calculations. Disabled fields are skipped by default; use `validateDisabled: true` if needed.

```ts
import { validateFormValues } from '@thuraaung2493/dynamic-form-core';

const result = validateFormValues(schema, values, {
  externalValidator: ({ values }) =>
    Number(values.income) > 100000
      ? [{
          code: 'custom',
          fieldName: 'income',
          message: 'Contact us for amounts over 100,000.',
        }]
      : [],
});

if (!result.valid) console.log(result.errors);
```

Core external validators return issues synchronously. The React package's `externalValidator` also accepts promises, which is useful for server-side checks.

## File and image values

Persisted assets use `{ kind: 'remote', url, ... }`. Newly selected browser `File` objects are structurally distinct and remain browser-owned values; the renderer/application controls uploading them.

## Traversal utilities

Use traversal helpers when building editors, summaries, or custom submission views:

```ts
import {
  flattenFields,
  getActiveFields,
  getFieldMap,
} from '@thuraaung2493/dynamic-form-core';

const everyField = flattenFields(schema);
const fieldsByName = getFieldMap(schema);
const activeFields = getActiveFields(schema, values);
```

`flattenFields` includes every conditional branch. `getActiveFields` follows the current `select` and `radio` values. `getFieldMap` includes all fields and uses field names as keys.

## License

MIT
