import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer.js';

export interface ModerationWarningInterface {
  id?: string;
  userId: string;
  timestamp?: number;
}

export interface ModerationPermitInterface {
  id?: string;
  userId: string;
}

export interface ModerationMessageCooldownInterface {
  id?: string;
  name: string;
  timestamp: number;
}

export const ModerationWarning = new EntitySchema<Readonly<Required<ModerationWarningInterface>>>({
  name:    'moderation_warning',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    userId:    { type: String },
    timestamp: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
  },
  indices: [
    { name: 'IDX_f941603aef2741795a9108d0d2', columns: ['userId'] },
  ],
});

export const ModerationPermit = new EntitySchema<Readonly<Required<ModerationPermitInterface>>>({
  name:    'moderation_permit',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    userId: { type: String },
  },
  indices: [
    { name: 'IDX_69499e78c9ee1602baee77b97d', columns: ['userId'] },
  ],
});