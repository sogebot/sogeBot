import { Filter } from '@devexpress/dx-react-grid';
import type { AlertInterface, EmitData } from '@entity/alert';
import type { BetsInterface } from '@entity/bets';
import type { CacheTitlesInterface } from '@entity/cacheTitles';
import type { CommandsCountInterface } from '@entity/commands';
import type { Event, Events } from '@entity/event';
import type { EventListInterface } from '@entity/eventList';
import type { GalleryInterface } from '@entity/gallery';
import type { HighlightInterface } from '@entity/highlight';
import type { OBSWebsocketInterface } from '@entity/obswebsocket';
import type { OverlayMapperMarathon, Overlay, TTSService } from '@entity/overlay';
import type { Permissions } from '@entity/permissions';
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
  'settings': (cb: (error: Error | string | null | unknown, settings: Record<string, any>, ui: Record<string, any>) => void) => void,
  'settings.update': (opts: Record<string,any>, cb: (error: Error | string | null | unknown) => void) => void,
  'settings.refresh': () => void,
  'set.value': (opts: { variable: string, value: any }, cb: (error: Error | string | null | unknown, opts: { variable: string, value: any } | null) => void) => void,
  'get.value': (variable: string, cb: (error: Error | string | null | unknown, value: any) => void) => void,
};

type generic<T extends Record<string, any>, K = 'id'> = {
  getAll: (cb: (error: Error | string | null | unknown, items: Readonly<Required<T>>[]) => void) => void,
  getOne: (id: Required<T[K]>, cb: (error: Error | string | null | unknown, item: Readonly<Required<T>> | null) => void) => void,
  setById: (opts: { id: Required<T[K]>, item: Partial<T> }, cb: (error: ValidationError[] | Error | string | null | unknown, item?: Readonly<Required<T>> | null) => void) => void,
  save: (item: Partial<T>, cb: (error: ValidationError[] | Error | string | null | unknown, item?: Readonly<Required<T>> | null) => void) => void,
  deleteById: (id: Required<T[K]>, cb: (error: Error | string | null | unknown) => void) => void;
  validate: (item: Partial<T>, cb: (error: ValidationError[] | Error | string | null | unknown) => void) => void,
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
    'debug::get': (cb: (error: Error | string | null | unknown, debug: string) => void) => void,
    'debug::set': (debug: string, cb: (error: Error | string | null | unknown) => void) => void,
    'panel::alerts': (cb: (error: Error | string | null | unknown, data: { errors: import('./panel/alerts').UIError[], warns: import('./panel/alerts').UIError[] }) => void) => void,
    'getLatestStats': (cb: (error: Error | string | null | unknown, stats: Record<string, any>) => void) => void,
    'populateListOf':<list extends possibleLists> (type: list, cb: (error: Error | string | null | unknown, data: getListOfReturn[list]) => void) => void,
    'custom.variable.value': (variableName: string, cb: (error: Error | string | null | unknown, value: string) => void) => void,
    'updateGameAndTitle': (emit: { game: string; title: string; tags: string[]; }, cb: (error: Error | string | null | unknown) => void) => void,
    'cleanupGameAndTitle': () => void,
    'getGameFromTwitch': (value: string, cb: (values: string[]) => void) => void,
    'getUserTwitchGames': (cb: (values: CacheTitlesInterface[], thumbnails: CacheGamesInterface[]) => void) => void,
    'integration::obswebsocket::generic::getOne': generic<OBSWebsocketInterface>['getOne'],
    'integration::obswebsocket::generic::getAll': generic<OBSWebsocketInterface>['getAll'],
    'integration::obswebsocket::generic::save': generic<OBSWebsocketInterface>['save'],
    'integration::obswebsocket::generic::deleteById': generic<OBSWebsocketInterface>['deleteById'],
    'integration::obswebsocket::call': (opts: { id: string, event: string, args?: any }, cb: (data: any) => void) => void,
    'integration::obswebsocket::callBatch': (opts: { id: string, requests: Record<string, any>[], options?: Record<string, any> }, cb: (data: any) => void) => void,
    'integration::obswebsocket::trigger': (opts: { code: string, attributes?: Events.Attributes }, cb: any) => void,
    'integration::obswebsocket::values': (cb: (data: { address: string, password: string }) => void) => void,
    'integration::obswebsocket::function': (fnc: any, cb: any) => void,
    'integration::obswebsocket::log': (toLog: string) => void,
    'integration::obswebsocket::listener': (opts: { event: string, args: any }) => void,
  },
  '/integrations/discord': GenericEvents & {
    'discord::getRoles': (cb: (err: Error | string | null | unknown, data: { text: string, value: string}[] ) => void) => void,
    'discord::getGuilds': (cb: (err: Error | string | null | unknown, data: { text: string, value: string}[] ) => void) => void,
    'discord::getChannels': (cb: (err: Error | string | null | unknown, data: { text: string, value: string}[] ) => void) => void,
    'discord::authorize': (cb: (err: Error | string | null | unknown, action?: null | { do: 'redirect', opts: any[] } ) => void) => void,
  },
  '/services/google': GenericEvents & {
    'google::revoke': (cb: (err: Error | string | null | unknown) => void) => void,
    'google::token': (data: { refreshToken: string }, cb: (err: Error | string | null | unknown) => void) => void,
  },
  '/integrations/donationalerts': GenericEvents & {
    'donationalerts::validate': (token: string, cb: (err: Error | string | null | unknown) => void) => void,
    'donationalerts::revoke': (cb: (err: Error | string | null | unknown) => void) => void,
    'donationalerts::token': (data: { accessToken: string, refreshToken: string }, cb: (err: Error | string | null | unknown) => void) => void,
  },
  '/integrations/spotify': GenericEvents & {
    'code': (token: string, cb: (err: Error | string | null | unknown, state: boolean) => void) => void,
    'spotify::revoke': (cb: (err: Error | string | null | unknown, opts?: { do: 'refresh' }) => void) => void,
    'spotify::authorize': (cb: (err: Error | string | null | unknown, action?: null | { do: 'redirect', opts: any[] }) => void) => void,
    'spotify::state': (cb: (err: Error | string | null | unknown, state: string) => void) => void,
    'spotify::code': (token: string, cb: (err: Error | string | null | unknown, state: boolean) => void) => void,
    'spotify::skip': (cb: (err: Error | string | null | unknown) => void) => void,
    'spotify::addBan': (spotifyUri: string, cb?: (err: Error | string | null | unknown) => void) => void,
    'spotify::deleteBan': (where: FindConditions<SpotifySongBanInterface>, cb?: (err: Error | string | null | unknown) => void) => void,
    'spotify::getAllBanned': (where: FindConditions<SpotifySongBanInterface>, cb?: (err: Error | string | null | unknown, items: SpotifySongBanInterface[]) => void) => void,
  },
  '/registries/overlays': GenericEvents & {
    'generic::deleteById': generic<Overlay>['deleteById'],
    'generic::save': generic<Overlay>['save'],
    'overlays::tick': (opts: {groupId: string, id: string, millis: number}) => void,
    'parse': (text: string, cb: (err: Error | string | null | unknown, data: string) => void) => void,
  },
  '/overlays/gallery': GenericEvents & {
    'generic::getOne': generic<GalleryInterface>['getOne'],
    'generic::getAll': generic<GalleryInterface>['getAll'],
    'generic::deleteById': generic<GalleryInterface>['deleteById'],
    'generic::setById': generic<GalleryInterface>['setById'],
    'gallery::upload': (data: [filename: string, data: { id: string, b64data: string, folder?: string }], cb: (err: Error | string | null | unknown, item?: OverlayMapperMarathon) => void) => void,
  },
  '/overlays/media': GenericEvents & {
    'alert': (data: any) => void,
    'cache': (cacheLimit: number, cb: (err: Error | string | null | unknown, data: any) => void) => void,
  },
  '/overlays/chat': GenericEvents & {
    'test': (data: { message: string; username: string }) => void,
    'timeout': (userName: string) => void,
    'message': (data: { id: string, show: boolean; message: string; username: string, timestamp: number, badges: any }) => void,
  },
  '/overlays/texttospeech': GenericEvents & {
    'speak': (data: { text: string; highlight: boolean, key: string }) => void,
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
    'clips': (opts: { customPeriod: number, numOfClips: number }, cb: (error: Error | string | null | unknown,data: { clips: any, settings: any }) => void) => void
  },
  '/overlays/credits': GenericEvents & {
    'load': (cb: (error: Error | string | null | unknown, opts: any) => void) => void,
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
    'marathon::public': (id: string, cb: (err: Error | string | null | unknown, item?: OverlayMapperMarathon) => void) => void,
    'marathon::check': (id: string, cb: (err: Error | string | null | unknown, item?: OverlayMapperMarathon) => void) => void,
    'marathon::update::set': (data: { time: number, id: string }) => void,
  },
  '/overlays/countdown': GenericEvents & {
    'countdown::check': (id: string, cb: (err: Error | string | null | unknown, update?: {
      timestamp: number;
      isEnabled: boolean;
      time: number;
    }) => void) => void,
    'countdown::update': (data: { id: string, isEnabled: boolean | null, time: number | null }, cb: (_err: null, data?: { isEnabled: boolean | null, time :string | null }) => void) => void,
    'countdown::update::set': (data: { id: string, isEnabled: boolean | null, time: number | null }) => void,
  },
  '/overlays/stopwatch': GenericEvents & {
    'stopwatch::check': (id: string, cb: (err: Error | string | null | unknown, update?: {
      timestamp: number;
      isEnabled: boolean;
      time: number;
    }) => void) => void,
    'stopwatch::update::set': (data: { id: string, isEnabled: boolean | null, time: number | null }) => void,
    'stopwatch::update': (data: any, cb: (_err: null, data?: { isEnabled: boolean | null, time :string | null }) => void) => void,
  },
  '/registries/alerts': GenericEvents & {
    'alerts::settings': (data: null | { areAlertsMuted: boolean; isSoundMuted: boolean; isTTSMuted: boolean; }, cb: (item: { areAlertsMuted: boolean; isSoundMuted: boolean; isTTSMuted: boolean; }) => void) => void,
    'test': (emit: EmitData) => void,
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
  '/registries/text': GenericEvents & {
    'text::save': (item: TextInterface, cb: (error: Error | string | null | unknown, item: TextInterface | null) => void) => void,
    'text::remove': (item: TextInterface, cb: (error: Error | string | null | unknown) => void) => void,
    'text::presets': (_: unknown, cb: (error: Error | string | null | unknown, folders: string[] | null) => void) => void,
    'generic::getAll': generic<TextInterface>['getAll'],
    'generic::getOne': (opts: { id: string, parseText: boolean }, cb: (error: Error | string | null | unknown, item: TextInterface & { parsedText: string }) => void) => void,
    'variable-changed': (variableName: string) => void,
  },
  '/services/twitch': GenericEvents & {
    'emote': (opts: any) => void,
    'emote.firework': (opts: any) => void,
    'emote.explode': (opts: any) => void,
    'hypetrain-end': () => void,
    'hypetrain-update': (data: { id: string, level: number, goal: number, total: number, subs: Record<string, string>}) => void,
    'eventsub::reset': () => void,
    'broadcaster': (cb: (error: Error | string | null | unknown, username: string) => void) => void,
    'twitch::revoke': (data: { accountType: 'bot' | 'broadcaster' }, cb: (err: Error | string | null | unknown) => void) => void,
    'twitch::token': (data: { accessToken: string, refreshToken: string, accountType: 'bot' | 'broadcaster' }, cb: (err: Error | string | null | unknown) => void) => void,
    'twitch::token::ownApp': (data: { accessToken: string, refreshToken: string, accountType: 'bot' | 'broadcaster', clientId: string, clientSecret: string }, cb: (err: Error | string | null | unknown) => void) => void,
  },
  '/core/socket': GenericEvents & {
    'purgeAllConnections': (cb: (error: Error | string | null | unknown) => void, socket?: Socket) => void,
  },
  '/stats/commandcount': GenericEvents & {
    'commands::count': (cb: (error: Error | string | null | unknown, items: CommandsCountInterface[]) => void) => void,
  },
  '/systems/emotescombo': GenericEvents & {
    'combo': (opts: { count: number; url: string }) => void,
  },
  '/systems/songs': GenericEvents & {
    'isPlaying': (cb: (isPlaying: boolean) => void) => void,
    'songs::getAllRequests': (_: any, cb: (error: Error | string | null | unknown, requests: SongRequestInterface[]) => void) => void,
    'current.playlist.tag': (cb: (error: Error | string | null | unknown, tag: string) => void) => void,
    'find.playlist': (opts: { filters?: Filter[], page: number, search?: string, tag?: string | null, perPage: number}, cb: (error: Error | string | null | unknown, songs: SongPlaylistInterface[], count: number) => void) => void,
    'songs::currentSong': (cb: (error: Error | string | null | unknown, song: currentSongType) => void) => void,
    'set.playlist.tag': (tag: string) => void,
    'get.playlist.tags': (cb: (error: Error | string | null | unknown, tags: string[]) => void) => void,
    'songs::save': (item: SongPlaylistInterface, cb: (error: Error | string | null | unknown, item: SongPlaylistInterface) => void) => void,
    'songs::getAllBanned': (where: Record<string, any> | null | undefined, cb: (error: Error | string | null | unknown, item: SongBanInterface[]) => void) => void,
    'songs::removeRequest': (id: string, cb: (error: Error | string | null | unknown) => void) => void,
    'delete.playlist': (id: string, cb: (error: Error | string | null | unknown) => void) => void,
    'delete.ban': (id: string, cb: (error: Error | string | null | unknown) => void) => void,
    'import.ban': (url: string, cb: (error: Error | string | null | unknown, result: import('../parser').CommandResponse[]) => void) => void,
    'import.playlist': (opts: { playlist: string, forcedTag: string | null }, cb: (error: Error | string | null | unknown, result: import('../parser').CommandResponse[] | null) => void) => void,
    'import.video': (opts: { playlist: string, forcedTag: string | null }, cb: (error: Error | string | null | unknown, result: import('../parser').CommandResponse[] | null) => void) => void,
    'stop.import': () => void,
    'next': () => void,
  },
  '/core/events': GenericEvents & {
    'events::getRedeemedRewards': (cb: (error: Error | string | null | unknown, rewards: { id: string, name: string }[]) => void) => void,
    'generic::getAll': (cb: (error: Error | string | null | unknown, data: Event[]) => void) => void,
    'generic::getOne': (id: string, cb: (error: Error | string | null | unknown, data?: Event) => void) => void,
    'list.supported.events': (cb: (error: Error | string | null | unknown, data: any[] /* TODO: missing type */) => void) => void,
    'list.supported.operations': (cb: (error: Error | string | null | unknown, data: any[] /* TODO: missing type */) => void) => void,
    'test.event': (opts: { id: string; randomized: string[], variables: string[], values: any[] }, cb: (error: Error | string | null | unknown) => void) => void,
    'events::save': (event: Event, cb: (error: Error | string | null | unknown, data: Event) => void) => void,
    'events::remove': (eventId: Required<Event['id']>, cb: (error: Error | string | null | unknown) => void) => void,
  },
  '/core/tts': GenericEvents & {
    'speak': (opts: { service: TTSService, text: string, key: string, voice: string; volume: number; rate: number; pitch: number; triggerTTSByHighlightedMessage?: boolean; } |
    { service: TTSService.ELEVENLABS, text: string, key: string, voice: string; volume: number; clarity: number; stability: number; exaggeration: number; triggerTTSByHighlightedMessage?: boolean; }, cb: (error: Error | string | null | unknown, b64mp3?: string) => void) => void,
  },
  '/core/ui': GenericEvents & {
    'configuration': (cb: (error: Error | string | null | unknown, data?: Configuration) => void) => void,
  },
  '/core/users': GenericEvents & {
    'viewers::update': (data: [userId: string, update: Partial<UserInterface> & { tips?: UserTipInterface[], bits?: UserBitInterface[] }], cb: (error: Error | string | null | unknown) => void) => void,
    'viewers::remove': (userId: string, cb: (error: Error | string | null | unknown) => void) => void,
    'getNameById': (id: string, cb: (error: Error | string | null | unknown, user: string | null) => void) => void,
    'viewers::findOneBy': (id: string, cb: (error: Error | string | null | unknown, viewer: ViewerReturnType) => void) => void
    'find.viewers': (opts: { exactUsernameFromTwitch?: boolean, state: string, page?: number; perPage?: number; order?: { orderBy: string, sortOrder: 'ASC' | 'DESC' }, filter?: { columnName: string, operation: string, value: any }[], search?: string }, cb: (error: Error | string | null | unknown, viewers: any[], count: number, state: string | null) => void) => void,
    'logout': (data: { accessToken: string | null, refreshToken: string | null }) => void
  },
};

type Fn<Params extends readonly any[] = readonly any[], Result = any> =
  (...params: Params) => Result;

type NestedFnParams<
  O extends Record<PropertyKey, Record<PropertyKey, Fn>>,
  K0 extends keyof O,
  K1 extends keyof O[K0],
> = Parameters<O[K0][K1]>;