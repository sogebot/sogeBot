import { simpleModeTasks } from '@entity/obswebsocket';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

@ObjectType()
class SetMuteArgs {
  @Field()
  source: string;
  @Field()
  mute: boolean;
}
@ObjectType()
export class SetMute implements simpleModeTasks.SetMute {
  @Field(type => ID)
  id: string;
  @Field(type => String)
  event: 'SetMute';
  @Field()
  args: SetMuteArgs;
}