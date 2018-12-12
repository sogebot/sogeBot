declare namespace NodeJS {
  export interface Global {
    db: any,
    commons: any,
    translate: any,
    log: any
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