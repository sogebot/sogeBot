import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer.js';

export interface PointsChangelogInterface {
  id: number;
  userId: string;
  originalValue: number;
  updatedValue: number;
  updatedAt: number;
  command: 'set' | 'add' | 'remove';
}

export const PointsChangelog = new EntitySchema<Readonly<Required<PointsChangelogInterface>>>({
  name:    'points_changelog',
  columns: {
    id: {
      type: Number, primary: true, generated: 'increment',
    },
    userId:        { type: String },
    originalValue: { type: Number },
    updatedValue:  { type: Number },
    updatedAt:     { type: 'bigint', transformer: new ColumnNumericTransformer() },
    command:       { type: String },
  },
  indices: [
    { name: 'IDX_points_changelog_userId', columns: ['userId'] },
  ],
});