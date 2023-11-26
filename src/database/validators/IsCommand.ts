import { z } from 'zod';

export function command() {
  return z.custom<string>(value => typeof value === 'string' && value.trim().length > 1 && value.startsWith('!'), 'isCommand');
}