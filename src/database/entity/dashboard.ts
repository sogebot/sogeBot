import { EntitySchema } from 'typeorm';

class QuickActionsDefaultAttributes {
  id: string;
  userId: string;
  order: number;
}

class QuickActionsDefaultOptions {
  label: string;
  color: string;
}

class CommandItemOptions extends QuickActionsDefaultOptions {
  command: string;
}
export class CommandItem extends QuickActionsDefaultAttributes {
  type: 'command';
  options: CommandItemOptions;
}

class CustomVariableItemOptions extends QuickActionsDefaultOptions {
  customvariable: string;
}
export class CustomVariableItem extends QuickActionsDefaultAttributes {
  type: 'customvariable';
  options: CustomVariableItemOptions;
}

class RandomizerItemOptions extends QuickActionsDefaultOptions {
  randomizerId: string;
}
export class RandomizerItem extends QuickActionsDefaultAttributes {
  type: 'randomizer';
  options: RandomizerItemOptions;
}

class OverlayCountdownItemOptions extends QuickActionsDefaultOptions {
  countdownId: string;
}
export class OverlayCountdownItem extends QuickActionsDefaultAttributes {
  type: 'overlayCountdown';
  options: OverlayCountdownItemOptions;
}

class OverlayMarathonItemOptions extends QuickActionsDefaultOptions {
  marathonId: string;
}
export class OverlayMarathonItem extends QuickActionsDefaultAttributes {
  type: 'overlayMarathon';
  options: OverlayMarathonItemOptions;
}

class OverlayStopwatchItemOptions extends QuickActionsDefaultOptions {
  stopwatchId: string;
}
export class OverlayStopwatchItem extends QuickActionsDefaultAttributes {
  type: 'overlayStopwatch';
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