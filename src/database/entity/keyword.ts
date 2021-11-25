import { EntitySchema } from 'typeorm';

export interface KeywordInterface {
  id?: string;
  keyword: string;
  enabled: boolean;
  group: string | null;
  responses?: KeywordsResponsesInterface[];
}
export class KeywordGroupInterface {
  name: string;
  options: {
    filter: string | null;
    permission: string | null;
  };
}
export interface KeywordsResponsesInterface {
  id?: string;
  keyword?: KeywordInterface;
  order: number;
  response: string;
  permission: string | null;
  filter: string;
  stopIfExecuted: boolean;
}

export const Keyword = new EntitySchema<Readonly<Required<KeywordInterface>>>({
  name:    'keyword',
  columns: {
    id: {
      type: 'char', primary: true, generated: 'uuid', length: 36,
    },
    keyword: { type: String },
    group:   { type: String, nullable: true },
    enabled: { type: Boolean },
  },
  indices: [
    { name: 'IDX_35e3ff88225eef1d85c951e229', columns: ['keyword'] },
  ],
  relations: {
    responses: {
      type:        'one-to-many',
      target:      'keyword_responses',
      inverseSide: 'keyword',
      cascade:     true,
    },
  },
});

export const KeywordResponses = new EntitySchema<Readonly<Required<KeywordsResponsesInterface>>>({
  name:    'keyword_responses',
  columns: {
    id: {
      type: 'char', primary: true, generated: 'uuid', length: 36,
    },
    order:          { type: Number },
    response:       { type: 'text' },
    stopIfExecuted: { type: Boolean },
    permission:     { type: String, nullable: true },
    filter:         { type: String },
  },
  relations: {
    keyword: {
      type:        'many-to-one',
      target:      'keyword',
      inverseSide: 'responses',
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const KeywordGroup = new EntitySchema<Readonly<Required<KeywordGroupInterface>>>({
  name:    'keyword_group',
  columns: {
    name: {
      type: String, primary: true,
    },
    options: { type: 'simple-json' },
  },
  indices: [
    { name: 'IDX_keyword_group_unique_name', columns: ['name'], unique: true },
  ],
});