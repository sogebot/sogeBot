import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { simpleModeTasks } from '../../../database/entity/obswebsocket';

@ObjectType()
class WaitMsArgs {
  @Field()
  miliseconds: number;
}
@ObjectType()
export class WaitMS implements simpleModeTasks.WaitMS {
  @Field(type => ID)
  id: string;
  @Field(type => String)
  event: 'WaitMs';
  @Field()
  args: WaitMsArgs;
}