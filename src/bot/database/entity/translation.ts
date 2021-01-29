import { EntitySchema } from 'typeorm';

export interface TranslationInterface {
  value: string; name: string;
}

export const Translation = new EntitySchema<Readonly<Required<TranslationInterface>>>({
  name:    'translation',
  columns: {
    name:  { type: String, primary: true },
    value: { type: String },
  },
});