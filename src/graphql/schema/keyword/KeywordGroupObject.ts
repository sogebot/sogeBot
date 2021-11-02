import { KeywordGroupInterface } from '@entity/keyword';
import { ObjectType } from 'type-graphql';

import { AliasGroupObject } from '../alias/AliasGroupObject';

@ObjectType()
export class KeywordGroupObject extends AliasGroupObject implements KeywordGroupInterface {}
