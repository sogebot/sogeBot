import { EntitySchema } from 'typeorm';

export interface PermissionsInterface {
  id?: string;
  name: string;
  order: number;
  isCorePermission: boolean;
  isWaterfallAllowed: boolean;
  automation: 'none' | 'casters' | 'moderators' | 'subscribers' | 'viewers' | 'followers' | 'vip';
  userIds: string[];
  excludeUserIds: string[];
  filters: PermissionFiltersInterface[];
}

export interface PermissionFiltersInterface {
  id?: string;
  permission: PermissionsInterface;
  comparator: '<' | '>' | '==' | '<=' | '>=';
  type: 'level' | 'ranks' | 'points' | 'watched' | 'tips' | 'bits' | 'messages' | 'subtier' | 'subcumulativemonths' | 'substreakmonths' | 'followtime';
  value: string;
}

export interface PermissionCommandsInterface {
  id?: string;
  permission: string | null;
  name: string;
}

export const Permissions = new EntitySchema<Readonly<Required<PermissionsInterface>>>({
  name:    'permissions',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    name:               { type: String },
    order:              { type: Number },
    isCorePermission:   { type: Boolean },
    isWaterfallAllowed: { type: Boolean },
    automation:         { type: 'varchar', length: 12 },
    userIds:            { type: 'simple-array' },
    excludeUserIds:     { type: 'simple-array' },
  },
  relations: {
    filters: {
      type:        'one-to-many',
      target:      'permission_filters',
      inverseSide: 'permission',
      cascade:     true,
    },
  },
});

export const PermissionFilters = new EntitySchema<Readonly<Required<PermissionFiltersInterface>>>({
  name:    'permission_filters',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    comparator: { type: 'varchar', length: 3 },
    type:       { type: 'varchar' },
    value:      { type: String },
  },
  relations: {
    permission: {
      type:        'many-to-one',
      target:      'permissions',
      inverseSide: 'filters',
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const PermissionCommands = new EntitySchema<Readonly<Required<PermissionCommandsInterface>>>({
  name:    'permission_commands',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    name:       { type: String },
    permission: {
      type: 'varchar', nullable: true, length: 36,
    },
  },
  indices: [
    { name: 'IDX_ba6483f5c5882fa15299f22c0a', columns: ['name'] },
  ],
});