import { getFieldMap } from './traversal.js';
import type {
  CalculationField,
  Field,
  FormSchema,
  FormValues,
} from './types.js';

export interface CalculationIssue {
  code: 'circular-dependency' | 'invalid-number' | 'invalid-reference';
  fieldName: string;
  dependency?: string;
  message: string;
}

export interface CalculationResult {
  values: FormValues;
  issues: CalculationIssue[];
}

const isCalculationField = (field: Field | undefined): field is CalculationField =>
  field?.type === 'calculation';

function toNumericValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  return undefined;
}

export function evaluateCalculations(
  schema: FormSchema,
  sourceValues: FormValues,
): CalculationResult {
  const fields = getFieldMap(schema);
  const values: FormValues = { ...sourceValues };
  const issues: CalculationIssue[] = [];
  const resolved = new Map<string, number | null>();
  const resolving = new Set<string>();

  const resolveDependency = (
    owner: CalculationField,
    dependencyName: string,
  ): number | null => {
    const dependency = fields.get(dependencyName);

    if (!dependency) {
      issues.push({
        code: 'invalid-reference',
        dependency: dependencyName,
        fieldName: owner.name,
        message: `Calculation field "${owner.name}" references unknown field "${dependencyName}".`,
      });
      return null;
    }

    if (isCalculationField(dependency)) {
      return resolveCalculation(dependency);
    }

    if (dependency.type !== 'number' && dependency.type !== 'currency') {
      issues.push({
        code: 'invalid-reference',
        dependency: dependencyName,
        fieldName: owner.name,
        message: `Calculation field "${owner.name}" cannot use nonnumeric field "${dependencyName}".`,
      });
      return null;
    }

    const numericValue = toNumericValue(values[dependencyName]);
    if (numericValue === undefined) {
      issues.push({
        code: 'invalid-number',
        dependency: dependencyName,
        fieldName: owner.name,
        message: `Field "${dependencyName}" does not contain a numeric value.`,
      });
      return null;
    }

    return numericValue;
  };

  const resolveCalculation = (field: CalculationField): number | null => {
    if (resolved.has(field.name)) {
      return resolved.get(field.name) ?? null;
    }

    if (resolving.has(field.name)) {
      issues.push({
        code: 'circular-dependency',
        fieldName: field.name,
        message: `Calculation field "${field.name}" has a circular dependency.`,
      });
      resolved.set(field.name, null);
      values[field.name] = null;
      return null;
    }

    resolving.add(field.name);
    let result = resolveDependency(field, field.calculation.initialField);

    if (result !== null) {
      for (const step of field.calculation.steps) {
        const operand = resolveDependency(field, step.field);
        if (operand === null) {
          result = null;
          break;
        }

        result = step.operation === 'add' ? result + operand : result - operand;
      }
    }

    resolving.delete(field.name);
    resolved.set(field.name, result);
    values[field.name] = result;
    return result;
  };

  for (const field of fields.values()) {
    if (isCalculationField(field)) {
      resolveCalculation(field);
    }
  }

  return { issues, values };
}
