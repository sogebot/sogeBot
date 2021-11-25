import { EntitySchema } from 'typeorm';

export interface ThreadEventInterface {
  id?: string; event: string;
}

export const ThreadEvent = new EntitySchema<Readonly<Required<ThreadEventInterface>>>({
  name:    'thread_event',
  columns: {
    id: {
      type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 'char' : 'uuid', primary: true, generated: 'uuid', length: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 36 : undefined,
    },
    event: { type: String },
  },
  indices: [
    { name: 'IDX_b8f5d0db148b37b4791a5e22c1', columns: ['event'] },
  ],
});