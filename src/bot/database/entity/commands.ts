import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface CommandsInterface {
  id?: string;
  command: string;
  enabled: boolean;
  visible: boolean;
  responses?: CommandsResponsesInterface[];
}

export interface CommandsResponsesInterface {
  id?: string;
  command?: CommandsInterface;
  order: number;
  response: string;
  permission: string;
  filter: string;
  stopIfExecuted: boolean;
}

export interface CommandsCountInterface {
  id?: number;
  command: string;
  timestamp: number;
}

export interface CommandsBoardInterface {
  id?: string;
  order: number;
  text: string;
  command: string;
}

export const Commands = new EntitySchema<Readonly<Required<CommandsInterface>>>({
  name: 'commands',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    command: { type: String },
    enabled: { type: Boolean },
    visible: { type: Boolean },
  },
  relations: {
    responses: {
      type: 'one-to-many',
      target: 'commands_responses',
      inverseSide: 'command',
      cascade: true,
    },
  },
  indices: [
    { name: 'IDX_1a8c40f0a581447776c325cb4f', columns: [ 'command' ]},
  ],
});

export const CommandsResponses = new EntitySchema<Readonly<Required<CommandsResponsesInterface>>>({
  name: 'commands_responses',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    order: { type: Number },
    response: { type: 'text' },
    stopIfExecuted: { type: Boolean },
    permission: { type: String },
    filter: { type: String },
  },
  relations: {
    command: {
      type: 'many-to-one',
      target: 'commands',
      inverseSide: 'responses',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
});

export const CommandsCount = new EntitySchema<Readonly<Required<CommandsCountInterface>>>({
  name: 'commands_count',
  columns: {
    id: { type: Number, primary: true, generated: 'rowid' },
    command: { type: String },
    timestamp: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
  indices: [
    { name: 'IDX_2ccf816b1dd74e9a02845c4818', columns: ['command'] },
  ],
});

export const CommandsBoard = new EntitySchema<Readonly<Required<CommandsBoardInterface>>>({
  name: 'commands_board',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    order: { type: Number },
    text: { type: String },
    command: { type: String },
  },
});