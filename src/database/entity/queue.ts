import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer.js';

export interface QueueInterface {
  id?: number;
  createdAt: number;
  username: string;
  isModerator: boolean;
  isSubscriber: boolean;
  message: string | null;
}

export const Queue = new EntitySchema<Readonly<Required<QueueInterface>>>({
  name:    'queue',
  columns: {
    id: {
      type: Number, primary: true, generated: 'increment',
    },
    createdAt:    { type: 'bigint', transformer: new ColumnNumericTransformer() },
    username:     { type: String },
    isModerator:  { type: Boolean },
    isSubscriber: { type: Boolean },
    message:      { type: String, nullable: true },
  },
  indices: [
    {
      name: 'IDX_7401b4e0c30f5de6621b38f7a0', columns: ['username'], unique: true,
    },
  ],
});