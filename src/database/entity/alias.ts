import {
  Field, ID, InputType, ObjectType,
} from 'type-graphql';
import { EntitySchema } from 'typeorm';

@InputType()
export class AliasInput {
  @Field({ nullable: true })
  alias?: string;
  @Field({ nullable: true })
  command?: string;
  @Field({ nullable: true })
  enabled?: boolean;
  @Field({ nullable: true })
  visible?: boolean;
  @Field({ nullable: true })
  permission?: string;
  @Field(type => String, { nullable: true })
  group?: string;
}
@ObjectType()
@InputType('AliasCreateInput')
export class AliasInterface {
  @Field(type => ID)
  id?: string;
  @Field()
  alias: string;
  @Field()
  command: string;
  @Field()
  enabled: boolean;
  @Field()
  visible: boolean;
  @Field(type => String, { nullable: true })
  permission: string | null;
  @Field(type => String, { nullable: true })
  group: string | null;
}
export class AliasGroupInterface {
  name: string;
  options: {
    filter: string | null;
    permission: string | null;
  };
}

export const Alias = new EntitySchema<Readonly<Required<AliasInterface>>>({
  name:    'alias',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    alias:      { type: String, nullable: false },
    command:    { type: 'text' },
    enabled:    { type: Boolean },
    visible:    { type: Boolean },
    permission: { type: String, nullable: true },
    group:      { type: String, nullable: true },
  },
  indices: [
    { name: 'IDX_6a8a594f0a5546f8082b0c405c', columns: ['alias'] },
  ],
});

export const AliasGroup = new EntitySchema<Readonly<Required<AliasGroupInterface>>>({
  name:    'alias_group',
  columns: {
    name: {
      type: String, primary: true,
    },
    options: { type: 'simple-json' },
  },
  indices: [
    { name: 'IDX_alias_group_unique_name', columns: ['name'], unique: true },
  ],
});