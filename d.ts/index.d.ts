declare module "*.vue" {
  import Vue from 'vue'
  export default Vue
}

declare namespace NodeJS {
  export interface Global {
    configuration: any,
    db: any,
    commons: any,
    translate: any,
    log: any,
    currency: any,
    panel: any,
    systems: any,
    users: any,
    lib: any,
    oauth: {
      settings: {
        bot: {
          username: string
        }
      }
    }
  }
}

type Command = {
  name: string,
  isHelper?: boolean,
  permission?: number
}

type onEventSub = {
  username: string,
  userId: string
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

type InterfaceSettings = {
  settings?: {
    commands?: Array<Command | string>,
    [s: string]: any
  },
  on?: {
    message?: (message: {
      sender: {
        username: string,
      } | null,
      message: string,
      timestamp: string
    }) => void,
    sub?: (syb: onEventSub) => void,
    follow?: (follow: onEventFollow) => void,
    tip?: (tip: onEventTip) => void,
    bit?: (bit: onEventBit) => void,
    streamStart?: () => void,
    streamEnd?: () => void,
    change?: Array<{
      [s: string]: Array<string>
    }>
  },
  ui?: {
    _hidden?: Boolean,
    [s: string]: {
      [s: string]: UISelector | UILink | UINumberInput
    } | Boolean | undefined
  }
}

type UISelector = {
  type: 'selector',
  values: Array<string>,
}

type UILink = {
  type: 'link',
  href: string,
  class: string,
  rawText: string,
  target: string
}

type UINumberInput = {
  type: 'number-input',
  step?: number,
  min?: number,
  max?: number,
}

type CommandOptions = {
  sender: {
    username: string
  } | null,
  command: string,
  parameters: string
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