import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface VariableInterface {
  id?: string;
  history?: VariableHistoryInterface[];
  urls?: VariableURLInterface[];
  variableName: string; description?: string; type: 'eval' | 'number' | 'options' | 'text';
  currentValue: string; evalValue: string; runEveryTypeValue?: number;
  runEveryType?: 'isUsed' | string; runEvery?: number; responseType: number; responseText?: string;
  permission: string; readOnly?: boolean; usableOptions: string[]; runAt?: number;
}

export const Variable = new EntitySchema<Readonly<Required<VariableInterface>>>({
  name: 'variable',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    variableName: {
      type: String,
    },
    description: {
      type: String,
      default: '',
    },
    type: {
      type: String,
    },
    currentValue: {
      type: String,
      nullable: true,
    },
    evalValue: {
      type: 'text',
    },
    runEveryTypeValue: {
      type: Number,
      default: 60000,
    },
    runEveryType: {
      type: String,
      default: 'isUsed',
    },
    runEvery: {
      type: Number,
      default: 60000,
    },
    responseType: {
      type: Number,
    },
    responseText: {
      type: String,
      default: '',
    },
    permission: {
      type: String,
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
    usableOptions: {
      type: 'simple-array',
    },
    runAt: {
      type: 'bigint',
      transformer: new ColumnNumericTransformer(),
      default: 0,
    },
  },
  relations: {
    history: {
      type: 'one-to-many',
      target: 'variable_history',
      inverseSide: 'variable',
    },
    urls: {
      type: 'one-to-many',
      target: 'variable_url',
      inverseSide: 'variable',
    },
  },
});

export interface VariableHistoryInterface {
  id?: string; variable?: VariableInterface; variableId: string | null;
  userId: number; username: string;
  currentValue: string; oldValue: any; changedAt: number;
}

export const VariableHistory = new EntitySchema<Readonly<VariableHistoryInterface>>({
  name: 'variable_history',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: 'rowid',
    },
    userId: {
      type: Number,
      default: 0,
    },
    username: {
      type: String,
      default: 'n/a',
    },
    currentValue: {
      type: String,
    },
    oldValue: {
      type: 'simple-json',
    },
    changedAt: {
      type: 'bigint',
      transformer: new ColumnNumericTransformer(),
      default: 0,
    },
    variableId: {
      type: String, nullable: true, name: 'variableId', length: ['mysql', 'mariadb'].includes(process.env.TYPEORM_CONNECTION ?? 'sqlite') ? 36 : undefined,
    },
  },
  relations: {
    variable: {
      type: 'many-to-one',
      target: 'variable',
      inverseSide: 'history',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      joinColumn: { name: 'variableId' },

    },
  },
});

export interface VariableURLInterface {
  id: string; GET: boolean; POST: boolean; showResponse: boolean; variable: VariableInterface; variableId: string | null;
}

export const VariableURL = new EntitySchema<Readonly<VariableURLInterface>>({
  name: 'variable_url',
  columns: {
    id: {
      type: String,
      primary: true,
      generated: 'uuid',
    },
    GET: {
      type: Boolean,
      default: false,
    },
    POST: {
      type: Boolean,
      default: false,
    },
    showResponse: {
      type: Boolean,
      default: false,
    },
    variableId: {
      type: String, nullable: true, name: 'variableId', length: ['mysql', 'mariadb'].includes(process.env.TYPEORM_CONNECTION ?? 'sqlite') ? 36 : undefined,
    },
  },
  relations: {
    variable: {
      type: 'many-to-one',
      target: 'variable',
      inverseSide: 'urls',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      joinColumn: { name: 'variableId' },
    },
  },
});

export interface VariableWatchInterface {
  id: string; variableId: string; order: number;
}

export const VariableWatch = new EntitySchema<Readonly<VariableWatchInterface>>({
  name: 'variable_watch',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: 'rowid',
    },
    variableId: {
      type: String, nullable: false, name: 'variableId',
    },
    order: {
      type: Number,
    },
  },
});