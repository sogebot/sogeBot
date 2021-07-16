import { EntitySchema } from 'typeorm';

export interface TextInterface {
  id?: string;
  name: string;
  text: string;
  css: string;
  js: string;
  external: string[];
}

export const Text = new EntitySchema<Readonly<Required<TextInterface>>>({
  name:    'text',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    name:     { type: String },
    text:     { type: 'text' },
    css:      { type: 'text' },
    js:       { type: 'text' },
    external: { type: 'simple-array' },
  },
});