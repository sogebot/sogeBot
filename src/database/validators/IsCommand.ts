import { z } from 'zod';

export function command() {
  return z.custom(value => typeof value === 'string' && value.trim().length > 1 && value.startsWith('!'), 'isCommand');
}