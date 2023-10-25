import { ValidationError } from 'class-validator';
import { isArray } from 'lodash-es';

export class UnauthorizedError extends Error {}
export class TokenError extends Error {}

export function isValidationError(e: unknown): e is ValidationError[] {
  return isArray(e) && e.length > 0 && e[0].constraints;
}