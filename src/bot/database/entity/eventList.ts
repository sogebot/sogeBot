import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface EventListInterface {
  id?: string;
  event: string;
  username: string;
  timestamp: number;
  isTest: boolean;
  values_json: string;
}

export const EventList = new EntitySchema<Readonly<Required<EventListInterface>>>({
  name: 'event_list',
  columns: {
    id: { type: Number, primary: true, generated: 'rowid' },
    event: { type: String },
    username: { type: String },
    timestamp: { type: 'bigint', transformer: new ColumnNumericTransformer() },
    isTest: { type: 'boolean' },
    values_json: { type: 'text' },
  },
  indices: [
    { name: 'IDX_8a80a3cf6b2d815920a390968a', columns: ['username'] },
  ],
});