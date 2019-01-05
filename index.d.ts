declare module "*.vue" {
  import Vue from 'vue'
  export default Vue
}

declare namespace NodeJS {
  export interface Global {
    db: any,
    commons: any,
    translate: any,
    log: any,
    currency: any,
    panel: any,
    systems: any
  }
}

type Command = {
  name: string,
  isHelper?: boolean,
  permission?: number
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
    tip?: (tip: {
      username: string,
      amount: number,
      message: string,
      currency: string,
      timestamp: string
    }) => void,
    bit?: (bit: {
      username: string,
      amount: number,
      message: string,
      timestamp: string
    }) => void,
    streamStart?: () => void,
    streamEnd?: () => void,
    change?: Array<{
      [s: string]: Array<string>
    }>
  },
  ui?: {
    [s: string]: {
      [s: string]: UISelector | UILink | UINumberInput
    }
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

declare interface Vote {
  _id?: any;
  vid: string;
  votedBy: string;
  votes: number;
  option: number;
}

declare interface Poll {
  _id?: any;
  type: 'tips' | 'bits' | 'normal';
  title: string;
  isOpened: boolean;
  options: string[];
  openedAt: string;
  closedAt?: string;
}