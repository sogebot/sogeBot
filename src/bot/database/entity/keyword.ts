import { EntitySchema } from 'typeorm';

export interface KeywordInterface {
  id?: string;
  keyword: string;
  enabled: boolean;
  responses?: KeywordsResponsesInterface[];
}
export interface KeywordsResponsesInterface {
  id?: string;
  keyword?: KeywordInterface;
  order: number;
  response: string;
  permission: string;
  filter: string;
  stopIfExecuted: boolean;
}

export const Keyword = new EntitySchema<Readonly<Required<KeywordInterface>>>({
  name:    'keyword',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid', 
    },
    keyword: { type: String },
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

export const CommandsResponses = new EntitySchema<Readonly<Required<KeywordsResponsesInterface>>>({
  name:    'keyword_responses',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid', 
    },
    order:          { type: Number },
    response:       { type: 'text' },
    stopIfExecuted: { type: Boolean },
    permission:     { type: String },
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