import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface CooldownInterface {
  id?: string;
  name: string;
  miliseconds: number;
  type: 'global' | 'user';
  timestamp?: number;
  isErrorMsgQuiet: boolean;
  isEnabled: boolean;
  isOwnerAffected: boolean;
  isModeratorAffected: boolean;
  isSubscriberAffected: boolean;
  isFollowerAffected: boolean;
  viewers?: CooldownViewerInterface[];
}

export interface CooldownViewerInterface {
  id?: string;
  cooldown?: CooldownInterface;
  userId: number;
  timestamp: number;
}

export const Cooldown = new EntitySchema<Readonly<Required<CooldownInterface>>>({
  name: 'cooldown',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    name: { type: String },
    miliseconds: { type: Number },
    type: { type: 'varchar', length: 10 },
    timestamp: { type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 },
    isErrorMsgQuiet: { type: Boolean },
    isEnabled: { type: Boolean },
    isOwnerAffected: { type: Boolean },
    isModeratorAffected: { type: Boolean },
    isSubscriberAffected: { type: Boolean },
    isFollowerAffected: { type: Boolean },
  },
  relations: {
    viewers: {
      type: 'one-to-many',
      target: 'cooldown_viewer',
      inverseSide: 'cooldown',
      cascade: true,
    },
  },
  indices: [
    { name: 'IDX_aa85aa267ec6eaddf7f93e3665', columns: [ 'name' ], unique: true },
  ],
});

export const CooldownViewer = new EntitySchema<Readonly<Required<CooldownViewerInterface>>>({
  name: 'cooldown_viewer',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    userId: { type: Number },
    timestamp: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
  relations: {
    cooldown: {
      type: 'many-to-one',
      target: 'cooldown',
      inverseSide: 'viewers',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
});