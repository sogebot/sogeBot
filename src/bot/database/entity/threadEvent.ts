import { EntitySchema } from 'typeorm';

export interface ThreadEventInterface {
  id?: number; event: string;
}

export const ThreadEvent = new EntitySchema<Readonly<Required<ThreadEventInterface>>>({
  name: 'thread_event',
  columns: {
    id: { type: String, primary: true, generated: 'rowid' },
    event: { type: String },
  },
  indices: [
    { name: 'IDX_b8f5d0db148b37b4791a5e22c1', columns: ['event'] },
  ],
});