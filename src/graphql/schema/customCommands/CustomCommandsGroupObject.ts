import { CommandsGroupInterface } from '@entity/commands';
import { ObjectType } from 'type-graphql';

import { AliasGroupObject } from '../alias/AliasGroupObject';

@ObjectType()
export class CustomCommandsGroupObject extends AliasGroupObject implements CommandsGroupInterface {}
