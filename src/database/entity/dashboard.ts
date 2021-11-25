import {
  createUnionType, Field, ID, InputType, ObjectType,
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
@InputType('QuickActionsDefaultAttributesInput')
class QuickActionsDefaultAttributes {
  @Field(type => ID)
    id: string;
  @Field()
    userId: string;
  @Field()
    order: number;
}

@ObjectType()
@InputType('QuickActionsDefaultOptionsInput')
class QuickActionsDefaultOptions {
  @Field()
    label: string;
  @Field()
    color: string;
}

@ObjectType()
@InputType('CommandItemOptionsInput')
class CommandItemOptions extends QuickActionsDefaultOptions {
  @Field()
    command: string;
}
@ObjectType()
@InputType('CommandItemInput')
export class CommandItem extends QuickActionsDefaultAttributes {
  @Field()
    type: 'command';
  @Field()
    options: CommandItemOptions;
}

@ObjectType()
@InputType('CustomVariableItemOptionsInput')
class CustomVariableItemOptions extends QuickActionsDefaultOptions {
  @Field()
    customvariable: string;
}
@ObjectType()
@InputType('CustomVariableItemInput')
export class CustomVariableItem extends QuickActionsDefaultAttributes {
  @Field()
    type: 'customvariable';
  @Field()
    options: CustomVariableItemOptions;
}

@ObjectType()
@InputType('RandomizerItemOptionsInput')
class RandomizerItemOptions extends QuickActionsDefaultOptions {
  @Field()
    randomizerId: string;
}
@ObjectType()
@InputType('RandomizerItemInput')
export class RandomizerItem extends QuickActionsDefaultAttributes {
  @Field()
    type: 'randomizer';
  @Field()
    options: RandomizerItemOptions;
}

@ObjectType()
@InputType('OverlayCountdownItemOptionsInput')
class OverlayCountdownItemOptions extends QuickActionsDefaultOptions {
  @Field()
    countdownId: string;
}
@ObjectType()
@InputType('OverlayCountdownItemInput')
export class OverlayCountdownItem extends QuickActionsDefaultAttributes {
  @Field()
    type: 'overlayCountdown';
  @Field()
    options: OverlayCountdownItemOptions;
}

@ObjectType()
@InputType('OverlayMarathonItemOptionsInput')
class OverlayMarathonItemOptions extends QuickActionsDefaultOptions {
  @Field()
    marathonId: string;
}
@ObjectType()
@InputType('OverlayMarathonItemInput')
export class OverlayMarathonItem extends QuickActionsDefaultAttributes {
  @Field()
    type: 'overlayMarathon';
  @Field()
    options: OverlayMarathonItemOptions;
}

@ObjectType()
@InputType('OverlayStopwatchItemOptionsInput')
class OverlayStopwatchItemOptions extends QuickActionsDefaultOptions {
  @Field()
    stopwatchId: string;
}
@ObjectType()
@InputType('OverlayStopwatchItemInput')
export class OverlayStopwatchItem extends QuickActionsDefaultAttributes {
  @Field()
    type: 'overlayStopwatch';
  @Field()
    options: OverlayStopwatchItemOptions;
}

@InputType()
export class QuickActionInput {
  @Field(type => [CommandItem],{ nullable: true })
    command?: CommandItem[];
  @Field(type => [CustomVariableItem],{ nullable: true })
    customvariable?: CustomVariableItem[];
  @Field(type => [RandomizerItem],{ nullable: true })
    randomizer?: RandomizerItem[];
  @Field(type => [OverlayCountdownItem],{ nullable: true })
    overlayCountdown?: OverlayCountdownItem[];
  @Field(type => [OverlayMarathonItem],{ nullable: true })
    overlayMarathon?: OverlayMarathonItem[];
  @Field(type => [OverlayStopwatchItem],{ nullable: true })
    overlayStopwatch?: OverlayStopwatchItem[];
}

export declare namespace QuickActions {
  type Item = CommandItem | CustomVariableItem | RandomizerItem | OverlayCountdownItem | OverlayStopwatchItem | OverlayMarathonItem;
}

export const QuickAction = new EntitySchema<Readonly<Required<QuickActions.Item>>>({
  name:    'quickaction',
  columns: {
    id: {
      type: 'varchar', primary: true, generated: 'uuid', length: 36,
    },
    userId:  { type: String },
    order:   { type: Number },
    type:    { type: String },
    options: { type: 'simple-json' },
  },
});