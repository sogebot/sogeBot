declare type ParserOptions = {
  sender: Object,
  message: string,
  skip: boolean
}

declare type CommandOptions = {
  sender: Object,
  command: string,
  parameters: string
}

declare type TimeoutsObject = {
  [string]: TimeoutID
}

declare type EventType = {
  type: string,
  timestamp: string,
  username: string,
  autohost?: boolean,
  message?: string,
  amount?: number,
  currency?: string,
  months?: number,
  bits?: number,
  viewers?: number,
  from?: number,
  tier?: string,
  song_title?: string,
  song_url?: string
}

declare type RatesObject = {
  [string]: number
}
