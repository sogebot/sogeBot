import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

export interface GoalGroupInterface {
  id?: string;
  goals: GoalInterface[];
  createdAt?: number;
  name: string;
  display: {
    type: 'fade';
    durationMs: number;
    animationInMs: number;
    animationOutMs: number;
  } | {
    type: 'multi';
    spaceBetweenGoalsInPx: number;
  };
}

export interface GoalInterface {
  id?: string;
  group?: GoalGroupInterface;
  groupId?: string | null;
  name: string;
  type: 'followers' | 'currentFollowers' | 'currentSubscribers' | 'subscribers' | 'tips' | 'bits';
  countBitsAsTips: boolean;
  display: 'simple' | 'full' | 'custom';
  timestamp?: number;
  goalAmount?: number;
  currentAmount?: number;
  endAfter: number;
  endAfterIgnore: boolean;
  customizationBar: {
    color: string;
    backgroundColor: string;
    borderColor: string;
    borderPx: number;
    height: number;
  };
  customizationFont: {
    family: string;
    color: string;
    size: number;
    weight: number;
    borderColor: string;
    borderPx: number;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  };
  customizationHtml: string;
  customizationJs: string;
  customizationCss: string;
}

export const GoalGroup = new EntitySchema<Readonly<Required<GoalGroupInterface>>>({
  name:    'goal_group',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    createdAt: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    name:    { type: String },
    display: { type: 'simple-json' },
  },
  relations: {
    goals: {
      type:        'one-to-many',
      target:      'goal',
      inverseSide: 'group',
      cascade:     true,
    },
  },
});

export const Goal = new EntitySchema<Readonly<Required<GoalInterface>>>({
  name:    'goal',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    name:            { type: String },
    groupId:         { type: String, nullable: true },
    type:            { type: 'varchar', length: 20 },
    countBitsAsTips: { type: Boolean },
    display:         { type: 'varchar', length: 20 },
    timestamp:       {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    goalAmount: {
      type: 'float', transformer: new ColumnNumericTransformer(), default: 0, precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined,
    },
    currentAmount: {
      type: 'float', transformer: new ColumnNumericTransformer(), default: 0, precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined,
    },
    endAfter:          { type: 'bigint', transformer: new ColumnNumericTransformer() },
    endAfterIgnore:    { type: Boolean },
    customizationBar:  { type: 'simple-json' },
    customizationFont: { type: 'simple-json' },
    customizationHtml: { type: 'text' },
    customizationJs:   { type: 'text' },
    customizationCss:  { type: 'text' },
  },
  indices: [
    { name: 'IDX_a1a6bd23cb8ef7ddf921f54c0b', columns: ['groupId'] },
  ],
  relations: {
    group: {
      type:        'many-to-one',
      target:      'goal_group',
      inverseSide: 'goals',
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
      joinColumn:  { name: 'groupId' },
    },
  },
});