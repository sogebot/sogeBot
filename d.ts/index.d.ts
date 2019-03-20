declare module "*.vue" {
  import Vue from 'vue'
  export default Vue
}

declare namespace NodeJS {
  export interface Global {
    api: any,
    mocha: boolean,
    configuration: any,
    cpu: any,
    db: any,
    commons: any,
    general: any,
    bot: any,
    translate: any,
    log: any,
    currency: any,
    panel: any,
    systems: any,
    users: any,
    lib: any,
    workers: import("../src/bot/workers").Workers,
    permissions: import("../src/bot/permissions").Permissions,
    customvariables: any,
    tmi: any,
    integrations: any,
    events: any,
    widgets: any,
    oauth: {
      settings: {
        broadcaster: {
          username: string,
        },
        bot: {
          username: string,
        },
        general: {
          channel: string,
        }
      }
    }
  }
}

type Sender = {
  username: string,
  userId: string,
  badges: {
    subscriber?: undefined | number,
    premium?: undefined | number,
    globalMod? : undefined | number,
    moderator? : undefined | number,
  }
}

type Command = {
  name: string,
  command?: string,
  fnc?: string,
  isHelper?: boolean,
  permission?: string,
  dependsOn?: string[],
}

type Parser = {
  name: string,
  fnc?: string,
  permission?: string,
  priority?: number,
  fireAndForget?: boolean,
  dependsOn?: string[],
}

type onEventSub = {
  username: string,
  userId: string,
  subCumulativeMonths: number,
}

type onEventFollow = {
  username: string,
  userId: string
}

type onEventTip = {
  username: string,
  amount: number,
  message: string,
  currency: string,
  timestamp: string
}

type onEventBit = {
  username: string,
  amount: number,
  message: string,
  timestamp: string
}

type onEventMessage = {
  sender: Sender | null,
  message: string,
  timestamp: string
}

declare namespace InterfaceSettings {
  type Settings<C> = {
    commands?: C,
    parsers?: Array<Parser>,
    [s: string]: any
  }

  type On = {
    message?: (message: onEventMessage) => void,
    sub?: (syb: onEventSub) => void,
    follow?: (follow: onEventFollow) => void,
    tip?: (tip: onEventTip) => void,
    bit?: (bit: onEventBit) => void,
    streamStart?: () => void,
    streamEnd?: () => void,
    change?: {
      [x: string]: Array<string>
    },
    load?: {
      [x: string]: Array<string>
    }
  }

  type UI = {
    _hidden: boolean,
    [x: string]: {
      [s: string]: UISelector | UILink | UINumberInput | UIConfigurableList | UISortableList | UITextInput
    } | boolean | UISelector | UILink | UINumberInput | UIConfigurableList | UISortableList | UITextInput,
  };
}

type InterfaceSettings = {
  settings?: InterfaceSettings.Settings<Array<Command | string>>,
  on?: InterfaceSettings.On,
  ui?: InterfaceSettings.UI,
  dependsOn?: string[],
}

type UISelector = {
  type: 'selector',
  values: Array<string>,
  if?: () => boolean,
}

type UIConfigurableList = {
  type: 'configurable-list',
  if?: () => boolean,
}

type UILink = {
  type: 'link',
  href: string,
  class: string,
  rawText: string,
  target: string,
  if?: () => boolean,
}

type UITextInput = {
  type: 'text-input',
  secret: boolean,
  if?: () => boolean,
}

type UINumberInput = {
  type: 'number-input',
  step?: number,
  min?: number,
  max?: number,
  if?: () => boolean,
}

type UISortableList = {
  type: 'sortable-list',
  values: string,
  toggle: string,
  toggleOnIcon: string,
  toggleOffIcon: string,
  if?: () => boolean,
}

type CommandOptions = {
  sender: Sender,
  command: string,
  parameters: string,
}

type ParserOptions = {
  sender: Sender,
  message: string,
  skip: boolean
}

type Vote = {
  _id?: any;
  vid: string;
  votedBy: string;
  votes: number;
  option: number;
}

type Poll = {
  _id?: any;
  type: 'tips' | 'bits' | 'normal';
  title: string;
  isOpened: boolean;
  options: string[];
  openedAt: number;
  closedAt?: number;
}