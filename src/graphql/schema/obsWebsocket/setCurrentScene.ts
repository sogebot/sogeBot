import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { simpleModeTasks } from '../../../database/entity/obswebsocket';

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