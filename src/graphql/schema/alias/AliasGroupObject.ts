import { AliasGroupInterface } from '@entity/alias';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { AliasGroupOptionsObject } from './AliasGroupOptionsObject';

@ObjectType()
export class AliasGroupObject implements AliasGroupInterface {
  @Field(type => ID)
    name: string;
  @Field(type => AliasGroupOptionsObject)
    options: AliasGroupInterface['options'];

}