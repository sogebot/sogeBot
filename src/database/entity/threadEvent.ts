import { EntitySchema } from 'typeorm';

export interface ThreadEventInterface {
  id?: string; event: string;
}

export const ThreadEvent = new EntitySchema<Readonly<Required<ThreadEventInterface>>>({
  name:    'thread_event',
  columns: {
    id: {
      type: 'char', primary: true, generated: 'uuid', length: 36,
    },
    event: { type: String },
  },
  indices: [
    { name: 'IDX_b8f5d0db148b37b4791a5e22c1', columns: ['event'] },
  ],
});