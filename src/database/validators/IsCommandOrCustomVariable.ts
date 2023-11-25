import { z } from 'zod';

export function commandOrCustomVariable () {
  return z.custom(value => typeof value === 'string'
  && (value.startsWith('!') || (value.length > 2 && value.startsWith('$_'))), 'IsCommandOrCustomVariable');
}