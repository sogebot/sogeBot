import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { simpleModeTasks } from '../../../database/entity/obswebsocket';

@ObjectType()
class SetVolumeArgs {
  @Field()
  source: string;
  @Field()
  volume: number;
}
@ObjectType()
export class SetVolume implements simpleModeTasks.SetVolume {
  @Field(type => ID)
  id: string;
  @Field(type => String)
  event: 'SetVolume';
  @Field()
  args: SetVolumeArgs;
}