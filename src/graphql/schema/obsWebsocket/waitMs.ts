import { simpleModeTasks } from '@entity/obswebsocket';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

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