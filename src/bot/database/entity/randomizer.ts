import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface RandomizerInterface {
  id?: string;
  items?: Required<RandomizerItemInterface>[];
  createdAt?: number;
  command: string;
  permissionId: string;
  name: string;
  isShown?: boolean;
  type: 'simple' | 'wheelOfFortune';
  customizationFont: {
    family: string;
    size: number;
    borderColor: string;
    borderPx: number;
  };
}

export interface RandomizerItemInterface {
  id?: string;
  randomizer: RandomizerInterface | undefined;
  randomizerId: string | null | undefined;
  /*
   * This should hlp with grouping things like Bancrupcy, WIN, Bancrupcy, to always appear beside
   */
  groupId: string | null; // Will be used to group items together
  name: string;
  color: string;
  numOfDuplicates?: number; // number of duplicates
  minimalSpacing?: number; // minimal space between duplicates
}

export const Randomizer = new EntitySchema<Readonly<Required<RandomizerInterface>>>({
  name: 'randomizer',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 },
    command: { type: String },
    isShown: { type: Boolean, default: false },
    type: { type: 'varchar', length: 20, default: 'simple' },
    customizationFont: { type: 'simple-json' },
    permissionId: { type: String },
    name: { type: String },
  },
  relations: {
    items: {
      type: 'one-to-many',
      target: 'randomizer_item',
      inverseSide: 'randomizer',
      cascade: true,
    },
  },
});

export const RandomizerItem = new EntitySchema<Readonly<Required<RandomizerItemInterface>>>({
  name: 'randomizer_item',
  columns: {
    id: { type: String, primary: true, generated: 'uuid' },
    randomizerId: { type: 'uuid', name: 'randomizerId', nullable: true },
    groupId: { type: 'varchar', nullable: true },
    name: { type: String },
    color: { type: 'varchar', length: 9, nullable: true },
    numOfDuplicates: { type: 'int', default: 1 },
    minimalSpacing: { type: 'int', default: 1 },
  },
  relations: {
    randomizer: {
      type: 'many-to-one',
      target: 'randomizer',
      inverseSide: 'items',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
});