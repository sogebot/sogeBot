declare module '*.vue' {
  import Vue from 'vue';
  export default Vue;
}

declare namespace NodeJS {
  export interface Global {
    linesParsed: number;
    status: {
      API: 0 | 1 | 2;
    };
    overlays: {
      alerts: import('../src/bot/overlays/alerts').Alerts;
      bets: import('../src/bot/overlays/bets').Bets;
      carousel: import('../src/bot/overlays/carousel').Carousel;
      clips: import('../src/bot/overlays/clips').Clips;
      clipsCarousel: import('../src/bot/overlays/clipsCarousel').ClipsCarousel;
      credits: import('../src/bot/overlays/credits').Credits;
      emotes: import('../src/bot/overlays/emotes').Emotes;
      eventlist: import('../src/bot/overlays/eventlist').EventList;
      gallery: import('../src/bot/overlays/gallery').Gallery;
      goals: import('../src/bot/overlays/goals').Goals;
      polls: import('../src/bot/overlays/polls').Polls;
      stats: import('../src/bot/overlays/stats').Stats;
      text: import('../src/bot/overlays/text').Text;
    };
    integrations: {
      donationalerts: import('../src/bot/integrations/donationalerts').Donationalerts;
      phillipshue: import('../src/bot/integrations/phillipshue').PhillipsHue;
      spotify: import('../src/bot/integrations/spotify').Spotify;
      streamlabs: import('../src/bot/integrations/streamlabs').Streamlabs;
      twitter: import('../src/bot/integrations/twitter').Twitter;
    };
    cache: any;
    client: any;
    api: any;
    mocha: boolean;
    configuration: any;
    cpu: any;
    db: any;
    games: {
      duel: import('../src/bot/games/duel').Duel;
      fightme: import('../src/bot/games/fightme').FightMe;
      gamble: import('../src/bot/games/gamble').Gamble;
      heist: import('../src/bot/games/heist').Heist;
      roulette: import('../src/bot/games/roulette').Roulette;
      seppuku: import('../src/bot/games/seppuku').Seppuku;
      wheelOfFortune: import('../src/bot/games/wheelOfFortune').WheelOfFortune;
    };
    logs: {
      commandcount: import('../src/bot/stats/commandcount').CommandCount;
    };
    general: any;
    bot: any;
    translate: any;
    log: any;
    currency: any;
    panel: any;
    systems: {
      alias: import('../src/bot/systems/alias').Alias;
      bets: import('../src/bot/systems/bets').Bets;
      checklist: import('../src/bot/systems/checklist').Checklist;
      commercial: import('../src/bot/systems/commercial').Commercial;
      cooldown: import('../src/bot/systems/cooldown').Cooldown;
      customCommands: import('../src/bot/systems/customCommands').CustomCommands;
      highlights: import('../src/bot/systems/highlights').Highlights;
      howlongtobeat: import('../src/bot/systems/howlongtobeat').HowLongToBeat;
      keywords: import('../src/bot/systems/keywords').Keywords;
      moderation: import('../src/bot/systems/moderation').Moderation;
      points: import('../src/bot/systems/points').Points;
      polls: import('../src/bot/systems/polls').Polls;
      price: import('../src/bot/systems/price').Price;
      queue: import('../src/bot/systems/queue').Queue;
      quotes: import('../src/bot/systems/quotes').Quotes;
      raffles: import('../src/bot/systems/raffles').Raffles;
      ranks: import('../src/bot/systems/ranks').Ranks;
      scrim: import('../src/bot/systems/scrim').Scrim;
      songs: import('../src/bot/systems/songs').Songs;
      timers: import('../src/bot/systems/timers').Timers;
      top: import('../src/bot/systems/top').Top;
      userinfo: import('../src/bot/systems/userinfo').UserInfo;
    };
    users: any;
    lib: any;
    workers: import('../src/bot/workers').Workers;
    permissions: import('../src/bot/permissions').Permissions;
    customvariables: any;
    tmi: any;
    events: import('../src/bot/events').Events;
    widgets: {
      chat: import('../src/bot/widgets/chat').Chat;
      cmdboard: import('../src/bot/widgets/cmdboard').Cmdboard;
      custom_variables: import('../src/bot/widgets/custom_variables').CustomVariables;
      eventlist: import('../src/bot/widgets/eventlist').EventList;
      joinpart: import('../src/bot/widgets/joinpart').JoinPart;
      social: import('../src/bot/widgets/social').Social;
      soundboard: import('../src/bot/widgets/soundboard').SoundBoard;
    };
    oauth: import('../src/bot/oauth').OAuth;
  }
}

interface Sender {
  username: string;
  displayName: string;
  userId: string;
  'message-type': 'chat' | 'whisper';
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
  timestamp: number;
}

interface onEventBit {
  username: string;
  amount: number;
  message: string;
  timestamp: number;
}

interface onEventMessage {
  sender: Sender | null;
  message: string;
  timestamp: number;
}

declare namespace InterfaceSettings {
  interface Settings<C> {
    commands?: C;
    parsers?: Parser[];
    [s: string]: any;
  }

  interface On {
    startup?: string[];
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