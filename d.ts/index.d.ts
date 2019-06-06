declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}

declare namespace NodeJS {
  export interface Global {
    status: {
      API: 0 | 1 | 2;
    };
    overlays: {
      alerts: import('../src/bot/overlays/alerts').Alerts;
      bets: import('../src/bot/overlays/bets').Bets;
      goals: import('../src/bot/overlays/goals').Goals;
      polls: import('../src/bot/overlays/polls').Polls;
      [x: string]: any; // remove after all overlays are ported to TS
    };
    integrations: {
      twitter: import('../src/bot/integrations/twitter').Twitter;
      [x: string]: any; // remove after all integrations are ported to TS
    };
    cache: any;
    client: any;
    api: any;
    mocha: boolean;
    configuration: any;
    cpu: any;
    db: any;
    general: any;
    bot: any;
    translate: any;
    log: any;
    currency: any;
    panel: any;
    systems: {
      bets: import('../src/bot/systems/bets').Bets;
      points: import('../src/bot/systems/points').Points;
      polls: import('../src/bot/systems/polls').Polls;
      scrim: import('../src/bot/systems/scrim').Scrim;
      top: import('../src/bot/systems/top').Top;
      userinfo: import('../src/bot/systems/userinfo').UserInfo;
      [x: string]: any; // remove after all systems are ported to TS
    };
    users: any;
    lib: any;
    workers: import('../src/bot/workers').Workers;
    permissions: import('../src/bot/permissions').Permissions;
    customvariables: any;
    tmi: any;
    events: import('../src/bot/events').Events;
    widgets: any;
    oauth: import('../src/bot/oauth').OAuth;
  }
}

interface Sender {
  username: string;
  userId: string;
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
  permission?: string;
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

interface onEventSub {
  username: string;
  userId: string;
  subCumulativeMonths: number;
}

interface onEventFollow {
  username: string;
  userId: string;
}

interface onEventTip {
  username: string;
  amount: number;
  message: string;
  currency: string;
  timestamp: string;
}

interface onEventBit {
  username: string;
  amount: number;
  message: string;
  timestamp: string;
}

interface onEventMessage {
  sender: Sender | null;
  message: string;
  timestamp: string;
}

declare namespace InterfaceSettings {
  interface Settings<C> {
    commands?: C;
    parsers?: Parser[];
    [s: string]: any;
  }

  interface On {
    message?: (message: onEventMessage) => void;
    sub?: (syb: onEventSub) => void;
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
  values: string[];
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
  type: 'tips' | 'bits' | 'normal';
  title: string;
  isOpened: boolean;
  options: string[];
  openedAt: number;
  closedAt?: number;
}

declare const enum ButtonStates {
  idle,
  progress,
  success,
  fail
}