import {
  createUnionType, Field, ID, ObjectType,
} from 'type-graphql';
import { EntitySchema } from 'typeorm';

export const SearchResultUnion = createUnionType({
  name:        'SearchResult',
  types:       () => [CommandItem, CustomVariableItem, RandomizerItem, OverlayCountdownItem, OverlayMarathonItem, OverlayStopwatchItem] as const,
  // our implementation of detecting returned object type
  resolveType: value => {
    if (value.type === 'command') {
      return CommandItem; // we can return object type class (the one with `@ObjectType()`)
    }
    if (value.type === 'customvariable') {
      return CustomVariableItem; // we can return object type class (the one with `@ObjectType()`)
    }
    if (value.type === 'randomizer') {
      return RandomizerItem; // we can return object type class (the one with `@ObjectType()`)
    }
    if (value.type === 'overlayCountdown') {
      return OverlayCountdownItem; // we can return object type class (the one with `@ObjectType()`)
    }
    if (value.type === 'overlayMarathon') {
      return OverlayMarathonItem; // we can return object type class (the one with `@ObjectType()`)
    }
    if (value.type === 'overlayStopwatch') {
      return OverlayStopwatchItem; // we can return object type class (the one with `@ObjectType()`)
    }
    return undefined;
  },
});
@ObjectType()
class QuickActionsDefaultAttributes {
  @Field(type => ID)
  id: string;
  @Field()
  userId: string;
  @Field()
  order: number;
}

@ObjectType()
class QuickActionsDefaultOptions {
  @Field()
  label: string;
  @Field()
  color: string;
}

@ObjectType()
class CommandItemOptions extends QuickActionsDefaultOptions {
  @Field()
  command: string;
}
@ObjectType()
export class CommandItem extends QuickActionsDefaultAttributes {
  @Field()
  type: 'command';
  @Field()
  options: CommandItemOptions;
}

@ObjectType()
class CustomVariableItemOptions extends QuickActionsDefaultOptions {
  @Field()
  customvariable: string;
}
@ObjectType()
export class CustomVariableItem extends QuickActionsDefaultAttributes {
  @Field()
  type: 'customvariable';
  @Field()
  options: CustomVariableItemOptions;
}

@ObjectType()
class RandomizerItemOptions extends QuickActionsDefaultOptions {
  @Field()
  randomizerId: string;
}
@ObjectType()
export class RandomizerItem extends QuickActionsDefaultAttributes {
  @Field()
  type: 'randomizer';
  @Field()
  options: RandomizerItemOptions;
}

@ObjectType()
class OverlayCountdownItemOptions extends QuickActionsDefaultOptions {
  @Field()
  countdownId: string;
}
@ObjectType()
export class OverlayCountdownItem extends QuickActionsDefaultAttributes {
  @Field()
  type: 'overlayCountdown';
  @Field()
  options: OverlayCountdownItemOptions;
}

@ObjectType()
class OverlayMarathonItemOptions extends QuickActionsDefaultOptions {
  @Field()
  marathonId: string;
}
@ObjectType()
export class OverlayMarathonItem extends QuickActionsDefaultAttributes {
  @Field()
  type: 'overlayMarathon';
  @Field()
  options: OverlayMarathonItemOptions;
}

@ObjectType()
class OverlayStopwatchItemOptions extends QuickActionsDefaultOptions {
  @Field()
  stopwatchId: string;
}
@ObjectType()
export class OverlayStopwatchItem extends QuickActionsDefaultAttributes {
  @Field()
  type: 'overlayStopwatch';
  @Field()
  options: OverlayStopwatchItemOptions;
}

export declare namespace QuickActions {
  type Item = CommandItem | CustomVariableItem | RandomizerItem | OverlayCountdownItem | OverlayStopwatchItem | OverlayMarathonItem;
}

export const QuickAction = new EntitySchema<Readonly<Required<QuickActions.Item>>>({
  name:    'quickaction',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    userId:  { type: String },
    order:   { type: Number },
    type:    { type: String },
    options: { type: 'simple-json' },
  },
});