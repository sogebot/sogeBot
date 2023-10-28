import { Filter } from '@devexpress/dx-react-grid';
import type { AlertInterface, EmitData } from '@entity/alert';
import type { BetsInterface } from '@entity/bets';
import type { CacheTitlesInterface } from '@entity/cacheTitles';
import type { ChecklistInterface } from '@entity/checklist';
import type { CommandsCountInterface, CommandsGroupInterface, CommandsInterface } from '@entity/commands';
import type { CooldownInterface } from '@entity/cooldown';
import type { EventInterface, Events } from '@entity/event';
import type { EventListInterface } from '@entity/eventList';
import type { GalleryInterface } from '@entity/gallery';
import type { HighlightInterface } from '@entity/highlight';
import type { HowLongToBeatGameInterface, HowLongToBeatGameItemInterface } from '@entity/howLongToBeatGame';
import type { KeywordGroupInterface, KeywordInterface } from '@entity/keyword';
import type { OBSWebsocketInterface } from '@entity/obswebsocket';
import type { OverlayMapperMarathon, Overlay } from '@entity/overlay';
import type { Permissions } from '@entity/permissions';
import type { QueueInterface } from '@entity/queue';
import type { QuotesInterface } from '@entity/quotes';
import type { RaffleInterface } from '@entity/raffle';
import type { RandomizerInterface } from '@entity/randomizer';
import type { RankInterface } from '@entity/rank';
import type { currentSongType, SongBanInterface, SongPlaylistInterface, SongRequestInterface } from '@entity/song';
import type { SpotifySongBanInterface } from '@entity/spotify';
import type { TextInterface } from '@entity/text';
import type {
  UserBitInterface, UserInterface, UserTipInterface,
} from '@entity/user';
import type { Variable, VariableWatch } from '@entity/variable';
import { HelixVideo } from '@twurple/api/lib';
import { ValidationError } from 'class-validator';
import { Socket } from 'socket.io';
import { FindConditions } from 'typeorm';

import { QuickActions } from '../../../src/database/entity/dashboard.js';
import { WidgetCustomInterface, WidgetSocialInterface } from '../../../src/database/entity/widget.js';

import { AliasGroup, Alias } from '~/database/entity/alias';
import { CacheGamesInterface } from '~/database/entity/cacheGames';
import { Plugin } from '~/database/entity/plugins';
import { MenuItem } from '~/helpers/panel';

type Configuration = {
  [x:string]: Configuration | string;
};

export type ViewerReturnType = UserInterface & {aggregatedBits: number, aggregatedTips: number, permission: Permissions, tips: UserTipInterface[], bits: UserBitInterface[] };
export type possibleLists = 'systems' | 'core' | 'integrations' | 'overlays' | 'games' | 'services';
export type tiltifyCampaign = { id: number, name: string, slug: string, startsAt: number, endsAt: null | number, description: string, causeId: number, originalFundraiserGoal: number, fundraiserGoalAmount: number, supportingAmountRaised: number, amountRaised: number, supportable: boolean, status: 'published', type: 'Event', avatar: {   src: string,   alt: string,   width: number,   height: number, }, livestream: {   type: 'twitch',   channel: string, } | null, causeCurrency: 'USD', totalAmountRaised: 0, user: {   id: number,   username: string,   slug: string,   url: string,   avatar: {     src: string,     alt: string,     width: number,     height: number,   }, }, regionId: null, metadata: Record<string, unknown>};

export interface getListOfReturn {
  systems: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  }[];
  services: { name: string }[];
  core: { name: string }[];
  integrations: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  }[];
  overlays: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  }[];
  games: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  }[];
}

type GenericEvents = {
  'settings': (cb: (error: Error | string | null, settings: Record<string, any>, ui: Record<string, any>) => void) => void,
  'settings.update': (opts: Record<string,any>, cb: (error: Error | string | null) => void) => void,
  'settings.refresh': () => void,
  'set.value': (opts: { variable: string, value: any }, cb: (error: Error | string | null, opts: { variable: string, value: any } | null) => void) => void,
  'get.value': (variable: string, cb: (error: Error | string | null, value: any) => void) => void,
};

type generic<T extends Record<string, any>, K = 'id'> = {
  getAll: (cb: (error: Error | string | null, items: Readonly<Required<T>>[]) => void) => void,
  getOne: (id: Required<T[K]>, cb: (error: Error | string | null, item: Readonly<Required<T>> | null) => void) => void,
  setById: (opts: { id: Required<T[K]>, item: Partial<T> }, cb: (error: ValidationError[] | Error | string | null, item?: Readonly<Required<T>> | null) => void) => void,
  save: (item: Partial<T>, cb: (error: ValidationError[] | Error | string | null, item?: Readonly<Required<T>> | null) => void) => void,
  deleteById: (id: Required<T[K]>, cb: (error: Error | string | null) => void) => void;
  validate: (item: Partial<T>, cb: (error: ValidationError[] | Error | string | null) => void) => void,
};

export type ClientToServerEventsWithNamespace = {
  '/': GenericEvents & {
    'token::broadcaster-missing-scopes': (cb: (scopes: string[]) => void) => void,
    'leaveBot': () => void,
    'joinBot': () => void,
    'channelName': (cb: (name: string) => void) => void,
    'name': (cb: (name: string) => void) => void,
    'responses.get': (_: null, cb: (data: { default: string; current: string }) => void) => void,
    'responses.set': (data: { name: string, value: string }) => void,
    'responses.revert': (data: { name: string }, cb: () => void) => void,
    'api.stats': (data: { code: number, remaining: number | string, data: string}) => void,
    'translations': (cb: (lang: Record<string, any>) => void) => void,
    'version': (cb: (version: string) => void) => void,
    'debug::get': (cb: (error: Error | string | null, debug: string) => void) => void,
    'debug::set': (debug: string, cb: (error: Error | string | null) => void) => void,
    'panel::alerts': (cb: (error: Error | string | null, data: { errors: import('./panel/alerts').UIError[], warns: import('./panel/alerts').UIError[] }) => void) => void,
    'getLatestStats': (cb: (error: Error | string | null, stats: Record<string, any>) => void) => void,
    'populateListOf':<list extends possibleLists> (type: list, cb: (error: Error | string | null, data: getListOfReturn[list]) => void) => void,
    'custom.variable.value': (variableName: string, cb: (error: Error | string | null, value: string) => void) => void,
    'updateGameAndTitle': (emit: { game: string; title: string; tags: string[]; }, cb: (error: Error | string | null) => void) => void,
    'cleanupGameAndTitle': () => void,
    'getGameFromTwitch': (value: string, cb: (values: string[]) => void) => void,
    'getUserTwitchGames': (cb: (values: CacheTitlesInterface[], thumbnails: CacheGamesInterface[]) => void) => void,
    'integration::obswebsocket::generic::getOne': generic<OBSWebsocketInterface>['getOne'],
    'integration::obswebsocket::generic::getAll': generic<OBSWebsocketInterface>['getAll'],
    'integration::obswebsocket::generic::save': generic<OBSWebsocketInterface>['save'],
    'integration::obswebsocket::generic::deleteById': generic<OBSWebsocketInterface>['deleteById'],
    'integration::obswebsocket::trigger': (opts: { code: string, attributes?: Events.Attributes }, cb: any) => void,
    'integration::obswebsocket::values': (cb: (data: { address: string, password: string }) => void) => void,
    'integration::obswebsocket::function': (fnc: any, cb: any) => void,
    'integration::obswebsocket::log': (toLog: string) => void,
  },
  '/core/plugins': GenericEvents & {
    'listeners': (cb: (listeners: Record<string, any>) => void) => void,
    'generic::getOne': generic<Plugin>['getOne'],
    'generic::getAll': generic<Plugin>['getAll'],
    'generic::save': generic<Plugin>['save'],
    'generic::deleteById': generic<Plugin>['deleteById'],
    'generic::validate': generic<Plugin>['validate'],
  },
  '/core/emotes': GenericEvents & {
    'testExplosion': (cb: (err: Error | string | null, data: null ) => void) => void,
    'testFireworks': (cb: (err: Error | string | null, data: null ) => void) => void,
    'test': (cb: (err: Error | string | null, data: null ) => void) => void,
    'removeCache': (cb: (err: Error | string | null, data: null ) => void) => void,
    'getCache': (cb: (err: Error | string | null, data: any ) => void) => void,
  },
  '/integrations/discord': GenericEvents & {
    'discord::getRoles': (cb: (err: Error | string | null, data: { text: string, value: string}[] ) => void) => void,
    'discord::getGuilds': (cb: (err: Error | string | null, data: { text: string, value: string}[] ) => void) => void,
    'discord::getChannels': (cb: (err: Error | string | null, data: { text: string, value: string}[] ) => void) => void,
    'discord::authorize': (cb: (err: Error | string | null, action?: null | { do: 'redirect', opts: any[] } ) => void) => void,
  },
  '/integrations/kofi': GenericEvents,
  '/services/google': GenericEvents & {
    'google::revoke': (cb: (err: Error | string | null) => void) => void,
    'google::token': (data: { refreshToken: string }, cb: (err: Error | string | null) => void) => void,
  },
  '/integrations/donationalerts': GenericEvents & {
    'donationalerts::validate': (token: string, cb: (err: Error | string | null) => void) => void,
    'donationalerts::revoke': (cb: (err: Error | string | null) => void) => void,
    'donationalerts::token': (data: { accessToken: string, refreshToken: string }, cb: (err: Error | string | null) => void) => void,
  },
  '/integrations/pubg': GenericEvents & {
    'pubg::searchForseasonId': (data: { apiKey: string, platform: string }, cb: (err: Error | string | null, data: null | { data: any[] }) => void) => void,
    'pubg::searchForPlayerId': (data: { apiKey: string, platform: string, playerName: string }, cb: (err: Error | string | null, data: null | any) => void) => void,
    'pubg::getUserStats': (data: { apiKey: string, platform: string, playerId: string, seasonId: string, ranked: boolean}, cb: (err: Error | string | null, data: null | any) => void) => void,
    'pubg::exampleParse': (data: { text: string}, cb: (err: Error | string | null, data: string | null) => void) => void,
  },
  '/integrations/tiltify': GenericEvents & {
    'tiltify::campaigns': (cb: (campaigns: tiltifyCampaign[]) => void) => void,
    'tiltify::code': (token: string, cb: (err: Error | string | null) => void) => void,
    'tiltify::revoke': (cb: (err: Error | string | null) => void) => void,
  },
  '/integrations/spotify': GenericEvents & {
    'code': (token: string, cb: (err: Error | string | null, state: boolean) => void) => void,
    'spotify::revoke': (cb: (err: Error | string | null, opts?: { do: 'refresh' }) => void) => void,
    'spotify::authorize': (cb: (err: Error | string | null, action?: null | { do: 'redirect', opts: any[] }) => void) => void,
    'spotify::state': (cb: (err: Error | string | null, state: string) => void) => void,
    'spotify::code': (token: string, cb: (err: Error | string | null, state: boolean) => void) => void,
    'spotify::skip': (cb: (err: Error | string | null) => void) => void,
    'spotify::addBan': (spotifyUri: string, cb?: (err: Error | string | null) => void) => void,
    'spotify::deleteBan': (where: FindConditions<SpotifySongBanInterface>, cb?: (err: Error | string | null) => void) => void,
    'spotify::getAllBanned': (where: FindConditions<SpotifySongBanInterface>, cb?: (err: Error | string | null, items: SpotifySongBanInterface[]) => void) => void,
  },
  '/overlays/eventlist': GenericEvents & {
    'getEvents': (opts: { ignore: any[], limit: number }, cb: (err: Error | string | null, data: EventListInterface[]) => void) => void,
    'eventlist::getUserEvents': (userId: string, cb: (err: Error | string | null, events: EventListInterface[]) => void) => void,
  },
  '/registries/overlays': GenericEvents & {
    'generic::getOne': generic<Overlay>['getOne'],
    'generic::getAll': generic<Overlay>['getAll'],
    'generic::deleteById': generic<Overlay>['deleteById'],
    'generic::save': generic<Overlay>['save'],
    'overlays::tick': (opts: {groupId: string, id: string, millis: number}) => void,
    'parse': (text: string, cb: (err: Error | string | null, data: string) => void) => void,
  },
  '/overlays/gallery': GenericEvents & {
    'generic::getOne': generic<GalleryInterface>['getOne'],
    'generic::getAll': generic<GalleryInterface>['getAll'],
    'generic::deleteById': generic<GalleryInterface>['deleteById'],
    'generic::setById': generic<GalleryInterface>['setById'],
    'gallery::upload': (data: [filename: string, data: { id: string, b64data: string, folder?: string }], cb: (err: Error | string | null, item?: OverlayMapperMarathon) => void) => void,
  },
  '/overlays/media': GenericEvents & {
    'alert': (data: any) => void,
    'cache': (cacheLimit: number, cb: (err: Error | string | null, data: any) => void) => void,
  },
  '/overlays/chat': GenericEvents & {
    'test': (data: { message: string; username: string }) => void,
    'timeout': (userName: string) => void,
    'message': (data: { id: string, show: boolean; message: string; username: string, timestamp: number, badges: any }) => void,
  },
  '/overlays/texttospeech': GenericEvents & {
    'speak': (data: { text: string; highlight: boolean, service: 0 | 1, key: string }) => void,
  },
  '/overlays/wordcloud': GenericEvents & {
    'wordcloud:word': (words: string[]) => void,
  },
  '/overlays/stats': GenericEvents & {
    'get': (cb: (data: any) => void) => void,
  },
  '/overlays/bets': GenericEvents & {
    'data': (cb: (data: Required<BetsInterface>) => void) => void,
  },
  '/overlays/clips': GenericEvents & {
    'clips': (data: any) => void
    'test': (clipURL: string) => void
  },
  '/overlays/clipscarousel': GenericEvents & {
    'clips': (opts: { customPeriod: number, numOfClips: number }, cb: (error: Error | string | null,data: { clips: any, settings: any }) => void) => void
  },
  '/overlays/credits': GenericEvents & {
    'load': (cb: (error: Error | string | null, opts: any) => void) => void,
    'getClips': (opts: Record<string, any>, cb: (data: any[]) => void) => void,
  },
  '/overlays/polls': GenericEvents & {
    'data': (cb: (item: {
      id: string,
      title: string,
      choices: {title: string, totalVotes: number, id: string}[],
      startDate: string,
      endDate: string,
    } | null, votes: any[]) => void) => void,
  },
  '/overlays/marathon': GenericEvents & {
    'marathon::public': (id: string, cb: (err: Error | string | null, item?: OverlayMapperMarathon) => void) => void,
    'marathon::check': (id: string, cb: (err: Error | string | null, item?: OverlayMapperMarathon) => void) => void,
    'marathon::update::set': (data: { time: number, id: string }) => void,
  },
  '/overlays/countdown': GenericEvents & {
    'countdown::check': (id: string, cb: (err: Error | string | null, update?: {
      timestamp: number;
      isEnabled: boolean;
      time: number;
    }) => void) => void,
    'countdown::update': (data: { id: string, isEnabled: boolean | null, time: number | null }, cb: (_err: null, data?: { isEnabled: boolean | null, time :string | null }) => void) => void,
    'countdown::update::set': (data: { id: string, isEnabled: boolean | null, time: number | null }) => void,
  },
  '/overlays/stopwatch': GenericEvents & {
    'stopwatch::check': (id: string, cb: (err: Error | string | null, update?: {
      timestamp: number;
      isEnabled: boolean;
      time: number;
    }) => void) => void,
    'stopwatch::update::set': (data: { id: string, isEnabled: boolean | null, time: number | null }) => void,
    'stopwatch::update': (data: { id: string, isEnabled: boolean | null, time: number | null }, cb: (_err: null, data?: { isEnabled: boolean | null, time :string | null }) => void) => void,
  },
  '/registries/alerts': GenericEvents & {
    'isAlertUpdated': (data: { updatedAt: number; id: string }, cb: (err: Error | null, isUpdated: boolean, updatedAt: number) => void) => void,
    'alerts::settings': (data: null | { areAlertsMuted: boolean; isSoundMuted: boolean; isTTSMuted: boolean; }, cb: (item: { areAlertsMuted: boolean; isSoundMuted: boolean; isTTSMuted: boolean; }) => void) => void,
    'alerts::save': (item: Required<AlertInterface>, cb: (error: Error | string | null, item: null | Required<AlertInterface>) => void) => void,
    'alerts::delete': (item: Required<AlertInterface>, cb: (error: Error | string | null) => void) => void,
    'test': (emit: EmitData) => void,
    'speak': (opts: { text: string, key: string, voice: string; volume: number; rate: number; pitch: number }, cb: (error: Error | string | null, b64mp3: string) => void) => void,
    'alert': (data: (EmitData & {
      id: string;
      isTTSMuted: boolean;
      isSoundMuted: boolean;
      TTSService: number;
      TTSKey: string;
      caster: UserInterface | null;
      user: UserInterface | null;
      recipientUser: UserInterface | null;
    })) => void,
    'skip': () => void,
  },
  '/registries/randomizer': GenericEvents & {
    'spin': (data: { service: 0 | 1, key: string }) => void,
  },
  '/core/permissions': GenericEvents & {
    'generic::deleteById': generic<Permissions>['deleteById'],
    'generic::getAll': generic<Permissions>['getAll'],
    'permission::save': (data: Required<Permissions>[], cb?: (error: Error | string | null) => void) => void,
    'test.user': (opts: { pid: string, value: string, state: string }, cb: (error: Error | string | null, response?: { status: import('../helpers/permissions/check').checkReturnType | { access: 2 }, partial: import('../helpers/permissions/check').checkReturnType | { access: 2 }, state: string }) => void) => void,
  },
  '/registries/text': GenericEvents & {
    'text::save': (item: TextInterface, cb: (error: Error | string | null, item: TextInterface | null) => void) => void,
    'text::remove': (item: TextInterface, cb: (error: Error | string | null) => void) => void,
    'text::presets': (_: unknown, cb: (error: Error | string | null, folders: string[] | null) => void) => void,
    'generic::getAll': generic<TextInterface>['getAll'],
    'generic::getOne': (opts: { id: string, parseText: boolean }, cb: (error: Error | string | null, item: TextInterface & { parsedText: string }) => void) => void,
    'variable-changed': (variableName: string) => void,
  },
  '/services/twitch': GenericEvents & {
    'emote': (opts: any) => void,
    'emote.firework': (opts: any) => void,
    'emote.explode': (opts: any) => void,
    'hypetrain-end': () => void,
    'hypetrain-update': (data: { id: string, level: number, goal: number, total: number, subs: Record<string, string>}) => void,
    'eventsub::reset': () => void,
    'broadcaster': (cb: (error: Error | string | null, username: string) => void) => void,
    'twitch::revoke': (data: { accountType: 'bot' | 'broadcaster' }, cb: (err: Error | string | null) => void) => void,
    'twitch::token': (data: { accessToken: string, refreshToken: string, accountType: 'bot' | 'broadcaster' }, cb: (err: Error | string | null) => void) => void,
    'twitch::token::ownApp': (data: { accessToken: string, refreshToken: string, accountType: 'bot' | 'broadcaster', clientId: string, clientSecret: string }, cb: (err: Error | string | null) => void) => void,
  },
  '/core/socket': GenericEvents & {
    'purgeAllConnections': (cb: (error: Error | string | null) => void, socket?: Socket) => void,
  },
  '/stats/commandcount': GenericEvents & {
    'commands::count': (cb: (error: Error | string | null, items: CommandsCountInterface[]) => void) => void,
  },
  '/stats/profiler': GenericEvents & {
    'profiler::load': (cb: (error: Error | string | null, items: [string, number[]][]) => void) => void,
  },
  '/stats/bits': GenericEvents & {
    'generic::getAll': generic<UserBitInterface & { username: string }>['getAll'],
  },
  '/stats/tips': GenericEvents & {
    'generic::getAll': generic<UserTipInterface & { username: string }>['getAll'],
  },
  '/systems/alias': GenericEvents & {
    'generic::getOne': generic<Alias>['getOne'],
    'generic::groups::getAll': generic<AliasGroup>['getAll'],
    'generic::groups::deleteById': generic<AliasGroup, 'name'>['deleteById'],
    'generic::groups::save': generic<AliasGroup>['save'],
    'generic::getAll': generic<Alias>['getAll'],
    'generic::save': generic<Alias>['save'],
    'generic::deleteById': generic<Alias>['deleteById'],
  },
  '/systems/bets': GenericEvents & {
    'bets::getCurrentBet': (cb: (error: Error | string | null, item?: BetsInterface) => void) => void,
    'bets::close': (option: 'refund' | string) => void,
  },
  '/systems/commercial': GenericEvents & {
    'commercial.run': (data: { seconds: string }) => void,
  },
  '/systems/highlights': GenericEvents & {
    'highlight': () => void,
    'generic::getAll': (cb: (error: Error | string | null, highlights: Readonly<Required<HighlightInterface>>[], videos: HelixVideo[]) => void) => void,
    'generic::deleteById': generic<HighlightInterface>['deleteById'],
  },
  '/systems/howlongtobeat': GenericEvents & {
    'generic::getAll': (cb: (error: Error | string | null, item: Readonly<Required<HowLongToBeatGameInterface>>[], gameItem: Readonly<Required<HowLongToBeatGameItemInterface>>[]) => void) => void,
    'hltb::save': (item: HowLongToBeatGameInterface, cb: (error: Error | string | null, item?: HowLongToBeatGameInterface) => void) => void,
    'hltb::addNewGame': (game: string, cb: (error: Error | string | null) => void) => void,
    'hltb::getGamesFromHLTB': (game: string, cb: (error: Error | string | null, games: string[]) => void) => void,
    'hltb::saveStreamChange': (stream: HowLongToBeatGameItemInterface, cb: (error: Error | string | null, stream?: HowLongToBeatGameItemInterface) => void) => void,
    'generic::deleteById': generic<HowLongToBeatGameInterface>['deleteById'],
  },
  '/systems/checklist': GenericEvents & {
    'generic::getAll': (cb: (error: Error | string | null, array: any[], items: Readonly<Required<ChecklistInterface>>[]) => void) => void,
    'checklist::save': (item: ChecklistInterface, cb: (error: Error | string | null) => void) => void,
  },
  '/games/seppuku': GenericEvents,
  '/games/heist': GenericEvents,
  '/games/fightme': GenericEvents,
  '/games/duel': GenericEvents,
  '/games/roulette': GenericEvents,
  '/games/gamble': GenericEvents,
  '/core/dashboard': GenericEvents,
  '/core/currency': GenericEvents,
  '/systems/userinfo': GenericEvents,
  '/systems/scrim': GenericEvents,
  '/systems/emotescombo': GenericEvents & {
    'combo': (opts: { count: number; url: string }) => void,
  },
  '/systems/antihateraid': GenericEvents,
  '/services/google': GenericEvents,
  '/integrations/twitter': GenericEvents,
  '/integrations/tipeeestream': GenericEvents,
  '/integrations/streamlabs': GenericEvents & {
    'revoke': (cb: (err: Error | string | null) => void) => void,
    'token': (data: { accessToken: string }, cb: (err: Error | string | null) => void) => void,
  },
  '/integrations/streamelements': GenericEvents,
  '/integrations/qiwi': GenericEvents,
  '/integrations/lastfm': GenericEvents,
  '/systems/levels': GenericEvents & {
    'getLevelsExample': (data: { firstLevelStartsAt: number, nextLevelFormula: string, xpName: string } | ((error: Error | string | null, levels: string[]) => void), cb?: (error: Error | string | null, levels: string[]) => void) => void,
  },
  '/systems/moderation': GenericEvents & {
    'lists.get': (cb: (error: Error | string | null, lists: { blacklist: string[], whitelist: string[] }) => void) => void,
    'lists.set': (lists: { blacklist: string[], whitelist: string[] }) => void,
  },
  '/systems/points': GenericEvents & {
    'parseCron': (cron: string, cb: (error: Error | string | null, intervals: number[]) => void) => void,
    'reset': () => void,
  },
  '/systems/queue': GenericEvents & {
    'queue::getAllPicked': (cb: (error: Error | string | null, items: QueueInterface[]) => void) => void,
    'queue::pick': (data: { username?: string | string[], random: boolean, count: number; }, cb: (error: Error | string | null, items: QueueInterface[]) => void) => void,
    'queue::clear': (cb: (error: Error | string | null) => void) => void,
    'generic::getAll': generic<QueueInterface>['getAll'],
  },
  '/systems/raffles': GenericEvents & {
    'raffle::getWinner': (name: string, cb: (error: Error | string | null, item?: UserInterface) => void) => void,
    'raffle::setEligibility': (opts: {id: string, isEligible: boolean}, cb: (error: Error | string | null) => void) => void,
    'raffle:getLatest': (cb: (error: Error | string | null, item?: RaffleInterface) => void) => void,
    'raffle::pick': () => void,
    'raffle::close': () => void,
    'raffle::open': (message: string) => void,
  },
  '/systems/songs': GenericEvents & {
    'isPlaying': (cb: (isPlaying: boolean) => void) => void,
    'songs::getAllRequests': (_: any, cb: (error: Error | string | null, requests: SongRequestInterface[]) => void) => void,
    'current.playlist.tag': (cb: (error: Error | string | null, tag: string) => void) => void,
    'find.playlist': (opts: { filters?: Filter[], page: number, search?: string, tag?: string | null, perPage: number}, cb: (error: Error | string | null, songs: SongPlaylistInterface[], count: number) => void) => void,
    'songs::currentSong': (cb: (error: Error | string | null, song: currentSongType) => void) => void,
    'set.playlist.tag': (tag: string) => void,
    'get.playlist.tags': (cb: (error: Error | string | null, tags: string[]) => void) => void,
    'songs::save': (item: SongPlaylistInterface, cb: (error: Error | string | null, item: SongPlaylistInterface) => void) => void,
    'songs::getAllBanned': (where: Record<string, any> | null | undefined, cb: (error: Error | string | null, item: SongBanInterface[]) => void) => void,
    'songs::removeRequest': (id: string, cb: (error: Error | string | null) => void) => void,
    'delete.playlist': (id: string, cb: (error: Error | string | null) => void) => void,
    'delete.ban': (id: string, cb: (error: Error | string | null) => void) => void,
    'import.ban': (url: string, cb: (error: Error | string | null, result: import('../parser').CommandResponse[]) => void) => void,
    'import.playlist': (opts: { playlist: string, forcedTag: string | null }, cb: (error: Error | string | null, result: import('../parser').CommandResponse[] | null) => void) => void,
    'import.video': (opts: { playlist: string, forcedTag: string | null }, cb: (error: Error | string | null, result: import('../parser').CommandResponse[] | null) => void) => void,
    'stop.import': () => void,
    'next': () => void,
  },
  '/widgets/joinpart': GenericEvents & {
    'joinpart': (data: { users: string[], type: 'join' | 'part' }) => void,
    'viewers': (cb: (error: Error | string | null, data: { chatters: any }) => void) => void,
  },
  '/widgets/chat': GenericEvents & {
    'message': (cb: (error: Error | string | null, message: { timestamp: string, message: string, username: string }) => void) => void,
    'room': (cb: (error: Error | string | null, room: string) => void) => void,
    'chat.message.send': (message: string) => void,
    'viewers': (cb: (error: Error | string | null, data: { chatters: any }) => void) => void,
  },
  '/widgets/customvariables': GenericEvents & {
    'watched::save': (items: VariableWatch[], cb: (error: Error | string | null, variables: VariableWatch[]) => void) => void,
    'customvariables::list': (cb: (error: Error | string | null, variables: Variable[]) => void) => void,
    'list.watch': (cb: (error: Error | string | null, variables: VariableWatch[]) => void) => void,
    'watched::setValue': (opts: { id: string, value: string | number }, cb: (error: Error | string | null) => void) => void,
  },
  '/widgets/eventlist': GenericEvents & {
    'eventlist::removeById': (idList: string[] | string, cb: (error: Error | string | null) => void) => void,
    'eventlist::get': (count: number) => void,
    'skip': () => void,
    'cleanup': () => void,
    'eventlist::resend': (id: string) => void,
    'update': (cb: (values: any) => void) => void,
    'askForGet': (cb: () => void) => void,
  },
  '/widgets/custom': GenericEvents & {
    'generic::getAll': (userId: string, cb: (error: Error | string | null, items: Readonly<Required<WidgetCustomInterface>>[]) => void) => void,
    'generic::save': generic<WidgetCustomInterface>['save'];
    'generic::deleteById': generic<WidgetCustomInterface>['deleteById'];
  },
  '/widgets/quickaction': GenericEvents & {
    'generic::deleteById': generic<QuickActions>['deleteById'],
    'generic::save': generic<QuickActions>['save'],
    'generic::getAll': (userId: string, cb: (error: Error | string | null, items: Readonly<Required<QuickActions>>[]) => void) => void,
    'trigger': (data: { user: { userId: string, userName: string }, id: string, value?: any}) => void,
  },
  '/widgets/social': GenericEvents & {
    'generic::getAll': generic<WidgetSocialInterface>['getAll'];
  },
  '/core/events': GenericEvents & {
    'events::getRedeemedRewards': (cb: (error: Error | string | null, rewards: { id: string, name: string }[]) => void) => void,
    'generic::getAll': (cb: (error: Error | string | null, data: EventInterface[]) => void) => void,
    'generic::getOne': (id: string, cb: (error: Error | string | null, data?: EventInterface) => void) => void,
    'list.supported.events': (cb: (error: Error | string | null, data: any[] /* TODO: missing type */) => void) => void,
    'list.supported.operations': (cb: (error: Error | string | null, data: any[] /* TODO: missing type */) => void) => void,
    'test.event': (opts: { id: string; randomized: string[], variables: string[], values: any[] }, cb: (error: Error | string | null) => void) => void,
    'events::save': (event: EventInterface, cb: (error: Error | string | null, data: EventInterface) => void) => void,
    'events::remove': (eventId: Required<EventInterface['id']>, cb: (error: Error | string | null) => void) => void,
  },
  '/core/tts': GenericEvents & {
    'google::speak': (opts: { volume: number; pitch: number; rate: number; text: string; voice: string; }, cb: (error: Error | string | null, audioContent?: string | null) => void) => void,
    'speak': (opts: { text: string, key: string, voice: string; volume: number; rate: number; pitch: number; triggerTTSByHighlightedMessage?: boolean; }, cb: (error: Error | string | null, b64mp3: string) => void) => void,
  },
  '/core/ui': GenericEvents & {
    'configuration': (cb: (error: Error | string | null, data?: Configuration) => void) => void,
  },
  '/core/updater': GenericEvents & {
    'updater::check': (cb: (error: Error | string | null) => void) => void,
    'updater::trigger': (opts: { pkg: string, version: string }, cb?: (error: Error | string | null) => void) => void,
  },
  '/core/users': GenericEvents & {
    'viewers::resetPointsAll': (cb?: (error: Error | string | null) => void) => void,
    'viewers::resetMessagesAll': (cb?: (error: Error | string | null) => void) => void,
    'viewers::resetWatchedTimeAll': (cb?: (error: Error | string | null) => void) => void,
    'viewers::resetSubgiftsAll': (cb?: (error: Error | string | null) => void) => void,
    'viewers::resetBitsAll': (cb?: (error: Error | string | null) => void) => void,
    'viewers::resetTipsAll': (cb?: (error: Error | string | null) => void) => void,
    'viewers::update': (data: [userId: string, update: Partial<UserInterface> & { tips?: UserTipInterface[], bits?: UserBitInterface[] }], cb: (error: Error | string | null) => void) => void,
    'viewers::remove': (userId: string, cb: (error: Error | string | null) => void) => void,
    'getNameById': (id: string, cb: (error: Error | string | null, user: string | null) => void) => void,
    'viewers::findOneBy': (id: string, cb: (error: Error | string | null, viewer: ViewerReturnType) => void) => void
    'find.viewers': (opts: { exactUsernameFromTwitch?: boolean, state: string, page?: number; perPage?: number; order?: { orderBy: string, sortOrder: 'ASC' | 'DESC' }, filter?: { columnName: string, operation: string, value: any }[], search?: string }, cb: (error: Error | string | null, viewers: any[], count: number, state: string | null) => void) => void,
    'logout': (data: { accessToken: string | null, refreshToken: string | null }) => void
  },
  '/core/general': GenericEvents & {
    'menu::private': (cb: (items: (MenuItem & { enabled: boolean })[]) => void) => void,
    'generic::getCoreCommands': (cb: (error: Error | string | null, commands: import('../general').Command[]) => void) => void,
    'generic::setCoreCommand': (commands: import('../general').Command, cb: (error: Error | string | null) => void) => void,
  },
  '/core/customvariables': GenericEvents & {
    'customvariables::list': (cb: (error: Error | string | null, items: Variable[]) => void) => void,
    'customvariables::runScript': (id: string, cb: (error: Error | string | null, items: Variable | null) => void) => void,
    'customvariables::testScript': (opts: { evalValue: string, currentValue: string }, cb: (error: Error | string | null, returnedValue: any) => void) => void,
    'customvariables::isUnique': (opts: { variable: string, id: string }, cb: (error: Error | string | null, isUnique: boolean) => void) => void,
    'customvariables::delete': (id: string, cb?: (error: Error | string | null) => void) => void,
    'customvariables::save': (item: Variable, cb: (error: ValidationError[] | Error | string | null, itemId: string | null) => void) => void,
  }
};

type Fn<Params extends readonly any[] = readonly any[], Result = any> =
  (...params: Params) => Result;

type NestedFnParams<
  O extends Record<PropertyKey, Record<PropertyKey, Fn>>,
  K0 extends keyof O,
  K1 extends keyof O[K0],
> = Parameters<O[K0][K1]>;