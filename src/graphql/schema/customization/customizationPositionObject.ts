import {
  Field, Float, ObjectType, 
} from 'type-graphql';

@ObjectType()
export class CustomizationPositionObject {
  @Field(type => Float)
  x: number;
  @Field(type => Float)
  y: number;
  @Field(type => String)
  anchorX: 'left' | 'middle' | 'right';
  @Field(type => String)
  anchorY: 'top' | 'middle' | 'bottom';
}