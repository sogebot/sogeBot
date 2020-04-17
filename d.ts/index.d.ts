type UserStateTags = import('twitch-js').UserStateTags;

type DiscordJsTextChannel = import('discord.js').TextChannel;
type DiscordJsUser = import('discord.js').User;

interface Command {
  name: string;
  command?: string;
  fnc?: string;
  isHelper?: boolean;
  permission?: string | null;
  dependsOn?: import('../src/bot/_interface').Module[];
}

interface Parser {
  name: string;
  fnc?: string;
  permission?: string;
  priority?: number;
  fireAndForget?: boolean;
  dependsOn?: import('../src/bot/_interface').Module[];
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
  sender: Partial<UserStateTags> | null;
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

interface CommandResponse {
  response: string | Promise<string>;
  sender: CommandOptions['sender'];
  attr: CommandOptions['attr'];
}

interface CommandOptions {
  sender: UserStateTags & { userId: number } & {
    discord?: { author: DiscordJsUser; channel: DiscordJsTextChannel };
  };
  command: string;
  parameters: string;
  createdAt: number;
  attr: {
    skip?: boolean;
    quiet?: boolean;
    [attr: string]: any;
  };
}

interface ParserOptions {
  sender: UserStateTags & { userId: number } & {
    discord?: { author: DiscordJsUser; channel: DiscordJsTextChannel };
  };
  parameters: string;
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