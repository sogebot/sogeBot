import { EntitySchema } from 'typeorm';

export interface KeywordInterface {
  id?: string;
  keyword: string;
  response: string;
  enabled: boolean;
}

export const Keyword = new EntitySchema<Readonly<Required<KeywordInterface>>>({
  name: 'keyword',
  columns: {
    id: { type: String, primary: true, generated: 'uuid' },
    keyword: { type: String },
    response: { type: String },
    enabled: { type: Boolean },
  },
  indices: [
    { name: 'IDX_35e3ff88225eef1d85c951e229', columns: ['keyword'] },
  ],
});