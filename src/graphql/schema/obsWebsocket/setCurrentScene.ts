import { simpleModeTasks } from '@entity/obswebsocket';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

@ObjectType()
class SetCurrentSceneArgs {
  @Field()
    sceneName: string;
}
@ObjectType()
export class SetCurrentScene implements simpleModeTasks.SetCurrentScene {
  @Field(type => ID)
    id: string;
  @Field(type => String)
    event: 'SetCurrentScene';
  @Field()
    args: SetCurrentSceneArgs;
}