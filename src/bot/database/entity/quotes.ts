import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface QuotesInterface {
  id?: number;
  tags: string[];
  quote: string;
  quotedBy: number;
  createdAt: number;
}

export const Quotes = new EntitySchema<Readonly<Required<QuotesInterface>>>({
  name: 'quotes',
  columns: {
    id: { type: 'int', primary: true, generated: 'increment' },
    tags: { type: 'simple-array' },
    quote: { type: String },
    quotedBy: { type: Number },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
});