import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { Type as SourceType, TypeCaps as TypeCaps2 } from '~/helpers/obswebsocket/sources';

@ObjectType()
class TypeCaps implements TypeCaps2 {
  @Field()
    canInteract: boolean;
  @Field()
    doNotDuplicate: boolean;
  @Field()
    doNotSelfMonitor: boolean;
  @Field()
    hasAudio: boolean;
  @Field()
    hasVideo: boolean;
  @Field()
    isAsync: boolean;
  @Field()
    isComposite: boolean;
  @Field()
    isDeprecated: boolean;
}

@ObjectType()
export class Type implements SourceType {
  @Field(type => ID)
    typeId: string;
  @Field()
    type: string;
  @Field()
    displayName: string;
  @Field(type => TypeCaps)
    caps: TypeCaps;
}