import { ObjectType } from 'type-graphql';

import { KeywordGroupInterface } from '../../../database/entity/keyword';
import { AliasGroupObject } from '../alias/AliasGroupObject';

@ObjectType()
export class KeywordGroupObject extends AliasGroupObject implements KeywordGroupInterface {}
