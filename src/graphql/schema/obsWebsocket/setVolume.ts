import { simpleModeTasks } from '@entity/obswebsocket';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

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