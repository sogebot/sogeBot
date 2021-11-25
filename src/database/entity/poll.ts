import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

export interface PollInterface {
  id?: string;
  type: 'tips' | 'bits' | 'normal' | 'numbers';
  title: string;
  isOpened: boolean;
  openedAt?: number;
  closedAt?: number;
  options: string[];
  votes?: PollVoteInterface[];
}

export interface PollVoteInterface {
  id?: string;
  poll: PollInterface;
  option: number;
  votes: number;
  votedBy: string;
}

export const Poll = new EntitySchema<Readonly<Required<PollInterface>>>({
  name:    'poll',
  columns: {
    id: {
      type: 'char', primary: true, generated: 'uuid', length: 36,
    },
    type:     { type: 'varchar', length: 7 },
    isOpened: { type: Boolean },
    openedAt: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    closedAt: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    options: { type: 'simple-array' },
    title:   { type: String },
  },
  relations: {
    votes: {
      type:        'one-to-many',
      target:      'poll_vote',
      inverseSide: 'poll',
      cascade:     true,
    },
  },
  indices: [
    { name: 'IDX_poll_isOpened', columns: ['isOpened'] },
  ],
});

export const PollVote = new EntitySchema<Readonly<Required<PollVoteInterface>>>({
  name:    'poll_vote',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    option:  { type: Number },
    votes:   { type: Number },
    votedBy: { type: String },
  },
  relations: {
    poll: {
      type:        'many-to-one',
      target:      'poll',
      inverseSide: 'votes',
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});