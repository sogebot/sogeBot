import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { simpleModeTasks } from '../../../database/entity/obswebsocket';

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