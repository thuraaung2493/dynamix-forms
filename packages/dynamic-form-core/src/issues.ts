export interface SchemaIssue {
  code:
    | 'circular-calculation'
    | 'duplicate-field-name'
    | 'duplicate-option-value'
    | 'invalid-calculation-reference'
    | 'invalid-calculation-reference-type'
    | 'invalid-type'
    | 'invalid-value'
    | 'missing-property'
    | 'unknown-field-type'
    | 'unknown-property';
  path: string;
  message: string;
  fieldName?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  issues: SchemaIssue[];
}

export class SchemaValidationError extends Error {
  readonly issues: SchemaIssue[];

  constructor(issues: SchemaIssue[]) {
    super(`The form schema is invalid (${issues.length} issue${issues.length === 1 ? '' : 's'}).`);
    this.name = 'SchemaValidationError';
    this.issues = issues;
  }
}

