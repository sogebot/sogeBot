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
  settings: {
    commands: Array<Command | string>
  },
  on: {
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
  }
}

type CommandOptions = {
  sender: {
    username: string
  },
  command: string,
  parameters: string
}

declare interface VoteType {
  _id?: any;
  vid: string;
  votedBy: string;
  votes: number;
  option: number;
}

declare interface VotingType {
  _id?: any;
  type: 'tips' | 'bits' | 'normal';
  title: string;
  isOpened: boolean;
  options: string[];
  openedAt: string;
  closedAt?: string;
}