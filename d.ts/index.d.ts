declare module '*.vue' {
  import Vue from 'vue';
  export default Vue;
}

declare module '*.txt' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.mp3' {
  const content: string;
  export default content;
}

declare namespace NodeJS {
  export interface Global {
    linesParsed: number;
    avgResponse: number[];
    status: {
      API: 0 | 1 | 2 | 3;
      MOD: boolean;
      TMI: 0 | 1 | 2 | 3;
      RES: number;
    };
    cache: any;
    client: any;
    mocha: boolean;
    configuration: any;
    cpu: any;
    db: any;
    stats2: any;
  }
}

interface Sender {
  username: string;
  displayName: string;
  userId: number;
  'message-type': 'chat' | 'whisper' | 'action';
  emotes: { id: number; start: number; end: number }[];
  badges: {
    subscriber?: undefined | number;
    premium?: undefined | number;
    globalMod? : undefined | number;
    moderator? : undefined | number;
  };
}

interface Command {
  name: string;
  command?: string;
  fnc?: string;
  isHelper?: boolean;
  permission?: string | null;
  dependsOn?: string[];
}

interface Parser {
  name: string;
  fnc?: string;
  permission?: string;
  priority?: number;
  fireAndForget?: boolean;
  dependsOn?: string[];
}

type onEventSub = {
  username: string;
  userId: number;
  subCumulativeMonths: number;
};

type onEventFollow = {
  username: string;
  userId: number;
};

type onEventTip = {
  username: string;
  amount: number;
  message: string;
  currency: string;
  timestamp: number;
};

type onEventBit = {
  username: string;
  amount: number;
  message: string;
  timestamp: number;
};

type onEventMessage = {
  sender: Sender | null;
  message: string;
  timestamp: number;
};

declare namespace InterfaceSettings {
  interface Settings<C> {
    commands?: C;
    parsers?: Parser[];
    [s: string]: any;
  }

  interface On {
    startup?: string[];
    message?: (message: onEventMessage) => void;
    sub?: (sub: onEventSub) => void;
    follow?: (follow: onEventFollow) => void;
    tip?: (tip: onEventTip) => void;
    bit?: (bit: onEventBit) => void;
    streamStart?: () => void;
    streamEnd?: () => void;
    change?: {
      [x: string]: string[];
    };
    load?: {
      [x: string]: string[];
    };
    partChannel?: () => void;
    reconnectChannel?: () => void;
    joinChannel?: () => void;
  }

  interface UI {
    [x: string]: {
      [s: string]: UISelector | UILink | UINumberInput | UIConfigurableList | UISortableList | UITextInput | UIHighlightsUrlGenerator;
    } | boolean | UISelector | UILink | UINumberInput | UIConfigurableList | UISortableList | UITextInput | UIHighlightsUrlGenerator;
  }
}

interface InterfaceSettings {
  settings?: InterfaceSettings.Settings<(Command | string)[]>;
  on?: InterfaceSettings.On;
  ui?: InterfaceSettings.UI;
  dependsOn?: string[];
}

interface UISelector {
  type: 'selector';
  values: string[] | (() => string[]);
  if?: () => boolean;
}

interface UIConfigurableList {
  type: 'configurable-list';
  if?: () => boolean;
}

interface UILink {
  type: 'link';
  href: string;
  class: string;
  rawText: string;
  target: string;
  if?: () => boolean;
}

interface UITextInput {
  type: 'text-input';
  secret: boolean;
  if?: () => boolean;
}

interface UINumberInput {
  type: 'number-input';
  step?: number;
  min?: number;
  max?: number;
  if?: () => boolean;
}

interface UISortableList {
  type: 'sortable-list';
  values: string;
  toggle: string;
  toggleOnIcon: string;
  toggleOffIcon: string;
  if?: () => boolean;
}

interface UIHighlightsUrlGenerator {
  type: 'highlights-url-generator';
  if?: () => boolean;
}

interface CommandOptions {
  sender: Sender;
  command: string;
  parameters: string;
  attr?: {
    skip?: boolean;
    quiet?: boolean;
  };
}

interface ParserOptions {
  sender: Sender;
  message: string;
  skip: boolean;
}

interface Vote {
  _id?: any;
  vid: string;
  votedBy: string;
  votes: number;
  option: number;
}

interface Poll {
  _id?: any;
  id: string;
  type: 'tips' | 'bits' | 'normal';
  title: string;
  isOpened: boolean;
  options: string[];
  openedAt: number;
  closedAt?: number;
}