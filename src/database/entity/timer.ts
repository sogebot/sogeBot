import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

export interface TimerInterface {
  id?: string;
  name: string;
  isEnabled: boolean;
  tickOffline: boolean;
  triggerEveryMessage: number;
  triggerEverySecond: number;
  triggeredAtTimestamp?: number;
  triggeredAtMessages?: number;
  messages: TimerResponseInterface[];
}

export interface TimerResponseInterface {
  id?: string;
  timestamp?: number;
  isEnabled?: boolean;
  response: string;
  timer?: TimerInterface;
}

export const Timer = new EntitySchema<Readonly<Required<TimerInterface>>>({
  name:    'timer',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    name:                 { type: String },
    isEnabled:            { type: Boolean },
    tickOffline:          { type: Boolean, default: false },
    triggerEveryMessage:  { type: Number },
    triggerEverySecond:   { type: Number },
    triggeredAtTimestamp: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    triggeredAtMessages: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
  },
  relations: {
    messages: {
      type:        'one-to-many',
      target:      'timer_response',
      inverseSide: 'timer',
      cascade:     true,
    },
  },
});

export const TimerResponse = new EntitySchema<Readonly<Required<TimerResponseInterface>>>({
  name:    'timer_response',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    timestamp: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    isEnabled: { type: Boolean, default: true },
    response:  { type: 'text' },
  },
  relations: {
    timer: {
      type:        'many-to-one',
      target:      'timer',
      inverseSide: 'messages',
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});