import {
  Field, ID, InputType, ObjectType,
} from 'type-graphql';
import { EntitySchema } from 'typeorm';

@InputType()
export class PermissionFiltersInput {
  @Field()
    comparator: '<' | '>' | '==' | '<=' | '>=';
  @Field()
    type: 'level' | 'ranks' | 'points' | 'watched' | 'tips' | 'bits' | 'messages' | 'subtier' | 'subcumulativemonths' | 'substreakmonths' | 'followtime';
  @Field()
    value: string;
}

@InputType()
export class PermissionInput {
  @Field({ nullable: true })
    name?: string;
  @Field({ nullable: true })
    order?: number;
  @Field({ nullable: true })
    isCorePermission?: boolean;
  @Field({ nullable: true })
    isWaterfallAllowed?: boolean;
  @Field({ nullable: true })
    automation?: 'none' | 'casters' | 'moderators' | 'subscribers' | 'viewers' | 'followers' | 'vip';
  @Field(type => [String], { nullable: true })
    userIds?: string[];
  @Field(type => [String], { nullable: true })
    excludeUserIds?: string[];
  @Field(type => [PermissionFiltersInput], { nullable: true })
    filters?: PermissionFiltersInput[];
}

@ObjectType()
export class PermissionFiltersInterface {
  @Field(type => ID)
    id?: string;
  @Field()
    comparator: '<' | '>' | '==' | '<=' | '>=';
  @Field()
    type: 'level' | 'ranks' | 'points' | 'watched' | 'tips' | 'bits' | 'messages' | 'subtier' | 'subcumulativemonths' | 'substreakmonths' | 'followtime';
  @Field()
    value: string;
  permission: PermissionsInterface;
}

@ObjectType()
export class PermissionsInterface {
  @Field(type => ID)
    id?: string;
  @Field()
    name: string;
  @Field()
    order: number;
  @Field()
    isCorePermission: boolean;
  @Field()
    isWaterfallAllowed: boolean;
  @Field()
    automation: 'none' | 'casters' | 'moderators' | 'subscribers' | 'viewers' | 'followers' | 'vip';
  @Field(type => [String])
    userIds: string[];
  @Field(type => [String])
    excludeUserIds: string[];
  @Field(type => [PermissionFiltersInterface])
    filters: PermissionFiltersInterface[];
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
      type: 'varchar', primary: true, generated: 'uuid', length: 36,
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
      type: 'varchar', primary: true, generated: 'uuid', length: 36,
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
      type: 'varchar', primary: true, generated: 'uuid', length: 36,
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