import { simpleModeTasks } from '@entity/obswebsocket';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

@ObjectType()
class TaskLogArgs {
  @Field()
    logMessage: string;
}
@ObjectType()
export class TaskLog implements simpleModeTasks.TaskLog {
  @Field(type => ID)
    id: string;
  @Field(type => String)
    event: 'Log';
  @Field()
    args: TaskLogArgs;
}