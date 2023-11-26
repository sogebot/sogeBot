import { z } from 'zod';

export function customvariable() {
  return z.custom(value => typeof value === 'string'
  && value.length > 2 && value.startsWith('$_'), 'isCustomVariable');
}