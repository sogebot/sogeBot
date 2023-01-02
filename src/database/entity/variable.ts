import {
  Field, ID, ObjectType,
} from 'type-graphql';
import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

@ObjectType()
export class VariableHistoryInterface {
  @Field(type => ID)
    id?: string;
  variable?: VariableInterface;
  variableId: string | null;
  @Field()
    userId: string;
  @Field()
    username: string;
  @Field()
    currentValue: string;
  @Field()
    oldValue: string;
  @Field()
    changedAt: number;
}

@ObjectType()
export class VariableURLInterface {
  @Field(type => ID)
    id: string;
  @Field()
    GET: boolean;
  @Field()
    POST: boolean;
  @Field()
    showResponse: boolean;
  variable: VariableInterface;
  variableId: string | null;
}

@ObjectType()
export class VariableWatchInterface {
  @Field(type => ID)
    id: string;
  variableId: string;
  @Field()
    order: number;
}

@ObjectType()
export class VariableInterface {
  @Field(type => ID)
    id?: string;
  @Field(type => [VariableHistoryInterface])
    history?: VariableHistoryInterface[];
  @Field(type => [VariableURLInterface])
    urls?: VariableURLInterface[];
  @Field()
    variableName: string;
  @Field()
    description?: string;
  @Field()
    type: 'eval' | 'number' | 'options' | 'text';
  @Field()
    currentValue: string;
  @Field()
    evalValue: string;
  @Field()
    runEveryTypeValue?: number;
  @Field()
    runEveryType?: 'isUsed' | string;
  @Field()
    runEvery?: number;
  @Field()
    responseType: number;
  @Field()
    responseText?: string;
  @Field()
    permission: string;
  @Field()
    readOnly?: boolean;
  @Field(type => [String])
    usableOptions: string[];
  @Field()
    runAt?: number;
}

export const Variable = new EntitySchema<Readonly<Required<VariableInterface>>>({
  name:    'variable',
  columns: {
    id: {
      type:      'uuid',
      primary:   true,
      generated: 'uuid',
    },
    variableName: { type: String },
    description:  {
      type:    String,
      default: '',
    },
    type:         { type: String },
    currentValue: {
      type:     String,
      nullable: true,
    },
    evalValue:         { type: 'text' },
    runEveryTypeValue: {
      type:    Number,
      default: 60000,
    },
    runEveryType: {
      type:    String,
      default: 'isUsed',
    },
    runEvery: {
      type:    Number,
      default: 60000,
    },
    responseType: { type: Number },
    responseText: {
      type:    String,
      default: '',
    },
    permission: { type: String },
    readOnly:   {
      type:    Boolean,
      default: false,
    },
    usableOptions: { type: 'simple-array' },
    runAt:         {
      type:        'bigint',
      transformer: new ColumnNumericTransformer(),
      default:     0,
    },
  },
  relations: {
    history: {
      type:        'one-to-many',
      target:      'variable_history',
      inverseSide: 'variable',
    },
    urls: {
      type:        'one-to-many',
      target:      'variable_url',
      inverseSide: 'variable',
    },
  },
});

export const VariableHistory = new EntitySchema<Readonly<VariableHistoryInterface>>({
  name:    'variable_history',
  columns: {
    id: {
      type:      Number,
      primary:   true,
      generated: 'increment',
    },
    userId: {
      type:    String,
      default: '0',
    },
    username: {
      type:    String,
      default: 'n/a',
    },
    currentValue: { type: String },
    oldValue:     { type: 'simple-json' },
    changedAt:    {
      type:        'bigint',
      transformer: new ColumnNumericTransformer(),
      default:     0,
    },
    variableId: {
      type: String, nullable: true, name: 'variableId', length: ['mysql', 'mariadb'].includes(process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') ? 36 : undefined,
    },
  },
  relations: {
    variable: {
      type:        'many-to-one',
      target:      'variable',
      inverseSide: 'history',
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
      joinColumn:  { name: 'variableId' },

    },
  },
});

export const VariableURL = new EntitySchema<Readonly<VariableURLInterface>>({
  name:    'variable_url',
  columns: {
    id: {
      type:      String,
      primary:   true,
      generated: 'uuid',
    },
    GET: {
      type:    Boolean,
      default: false,
    },
    POST: {
      type:    Boolean,
      default: false,
    },
    showResponse: {
      type:    Boolean,
      default: false,
    },
    variableId: {
      type: String, nullable: true, name: 'variableId', length: ['mysql', 'mariadb'].includes(process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') ? 36 : undefined,
    },
  },
  relations: {
    variable: {
      type:        'many-to-one',
      target:      'variable',
      inverseSide: 'urls',
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
      joinColumn:  { name: 'variableId' },
    },
  },
});

export const VariableWatch = new EntitySchema<Readonly<VariableWatchInterface>>({
  name:    'variable_watch',
  columns: {
    id: {
      type:      Number,
      primary:   true,
      generated: 'increment',
    },
    variableId: {
      type: String, nullable: false, name: 'variableId',
    },
    order: { type: Number },
  },
});