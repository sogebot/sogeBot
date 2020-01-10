import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface ChangelogInterface {
  id: number; timestamp: number; threadId: string; namespace: string;
}

export const Changelog = new EntitySchema<Readonly<Required<ChangelogInterface>>>({
  name: 'changelog',
  columns: {
    id: { type: Number, primary: true, generated: 'rowid' },
    timestamp: { type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 },
    threadId: { type: String },
    namespace: { type: String },
  },
});