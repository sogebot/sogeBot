import type ObsWebSocket from 'obs-websocket-js';
import { Socket } from 'socket.io';

import type { AlertInterface, AlertMediaInterface } from '../database/entity/alert';
import type { CommandsBoardInterface } from '../database/entity/commands';
import type { CooldownInterface } from '../database/entity/cooldown';
import type { DashboardInterface } from '../database/entity/dashboard';
import type { EventInterface } from '../database/entity/event';
import type { GoalGroupInterface } from '../database/entity/goal';
import type { HowLongToBeatGameInterface, HowLongToBeatGameItemInterface } from '../database/entity/howLongToBeatGame';
import type { KeywordInterface } from '../database/entity/keyword';
import { OBSWebsocketInterface } from '../database/entity/obswebsocket';
import type { PermissionsInterface } from '../database/entity/permissions';
import type { PriceInterface } from '../database/entity/price';
import type { RandomizerInterface } from '../database/entity/randomizer';
import type { RankInterface } from '../database/entity/rank';
import type { SongPlaylistInterface } from '../database/entity/song';
import type { TextInterface } from '../database/entity/text';
import type { TimerInterface } from '../database/entity/timer';
import type { UserInterface } from '../database/entity/user';
import type { VariableInterface, VariableWatchInterface } from '../database/entity/variable';
import type PUBG from '../integrations/pubg';

const endpoints: {
  type: 'admin' | 'viewer' | 'public';
  on: string;
  nsp: string;
  callback: any;
}[] = [];

// cb only
function adminEndpoint (
  nsp: string,
  on: 'generic::getAll' | 'list.supported.events' | 'list.supported.operations'
  | 'randomizer::hideAll' | 'randomizer::getVisible' | 'queue::getAllPicked' | 'queue::clear'
  | 'spotify::revoke' | 'spotify::skip' | 'spotify::state' | 'spotify::authorize'
  | 'getSoundBoardSounds'  | 'viewers' | 'viewers::resetPointsAll' | 'viewers::resetMessagesAll'
  | 'viewers::resetWatchedTimeAll' | 'viewers::resetBitsAll' | 'viewers::resetTipsAll'
  | 'viewers::resetSubgiftsAll' | 'list.watch' | 'broadcaster' | 'configuration' | 'raffle:getLatest'
  | 'lists.get' | 'bets::getCurrentBet' | 'commands::count' | 'getLatestStats' | 'menu' | 'panel::errors'
  | 'removeCache' | 'testExplosion' | 'testFireworks' | 'test' | 'discord::authorize'
  | 'discord::getChannels' | 'discord::getRoles' | 'discord::getGuilds' | 'settings'
  | 'debug::get' | 'getLevelsExample' | 'profiler::load' | 'integration::obswebsocket::getCommand',
  callback: (cb: (error: Error | string | null, ...response: any) => void) => void | Promise<void>): void;

// id + cb
function adminEndpoint (
  nsp: string,
  on: 'generic::getOne' | 'generic::deleteById' | 'customvariables::runScript' | 'customvariables::delete'
  | 'test.event' | 'alerts::deleteMedia' | 'alerts::getOneMedia' | 'randomizer::showById'
  | 'eventlist::resend' | 'viewers::followedAt',
  callback: (id: string, cb: (error: Error | string | null, ...response: any) => void) => void): void;

// string + cb
function adminEndpoint (
  nsp: string,
  on: 'chat.message.send' | 'import.ban' | 'songs::removeRequest' | 'delete.playlist' | 'delete.ban'
  | 'raffle::getWinner' | 'raffle::open' | 'parseCron' | 'debug::set'
  | 'commands::resetCountByCommand' | 'bets::close' | 'spotify::code',
  callback: (string: string, cb: (error: Error | string | null, ...response: any) => void) => void): void;

// number + cb
function adminEndpoint (
  nsp: string,
  on: 'getNameById',
  callback: (string: number, cb: (error: Error | string | null, ...response: any) => void) => void): void;

function adminEndpoint (
  nsp: string,
  on: 'generic::setById',
  callback: (opts: {id: string | number; item: any}, cb: (error: Error | string | null, ...response: any) => void) => void): void;

// any + cb
function adminEndpoint (
  nsp: string,
  on: 'generic::getAll::filter',
  callback: (opts: any, cb: (error: Error | string | null, ...response: any) => void) => void): void;

// non generic
function adminEndpoint (nsp: string, on: 'panel::dashboards::save', callback: (dashboards: Readonly<Required<DashboardInterface>>[]) => void): void;
function adminEndpoint (nsp: string, on: 'eventlist::getUserEvents', callback: (username: string, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'eventlist::get', callback: (count: number, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'customvariables::list', callback: (cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'customvariables::testScript', callback: (opts: { currentValue: any; evalValue: any }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'customvariables::isUnique', callback: (opts: { variable: any; id: any }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'customvariables::save', callback: (item: Readonly<Required<VariableInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'permission::save', callback: (data: Readonly<Required<PermissionsInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'permissions', callback: (cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'test.user', callback: (opts: { value: string | number; pid: string; state: any }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'text::remove' | 'text::save', callback: (item: Readonly<Required<TextInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'events::remove' | 'events::save', callback: (item: Readonly<Required<EventInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'events::getRedeemedRewards', callback: (cb: (error: Error | string | null, response: string[]) => void) => void): void;
function adminEndpoint (nsp: string, on: 'carousel::save', callback: (items: Readonly<Required<EventInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'carousel::insert', callback: (data: string, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'goals::remove' | 'goals::save', callback: (item: Readonly<Required<GoalGroupInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'alerts::saveMedia', callback: (item: Readonly<Required<AlertMediaInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'alerts::cloneMedia', callback: (toClone: [string, string], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'alerts::save' | 'alerts::delete', callback: (item: Readonly<Required<AlertInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'randomizer::save' | 'randomizer::remove', callback: (item: Readonly<Required<RandomizerInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'cooldown::save', callback: (item: Readonly<Required<CooldownInterface>> & Readonly<Required<CooldownInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'hltb::save', callback: (item: Readonly<Required<HowLongToBeatGameInterface>> & Readonly<Required<HowLongToBeatGameInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'hltb::saveStreamChange', callback: (stream: Readonly<Required<HowLongToBeatGameItemInterface>> & Readonly<Required<HowLongToBeatGameItemInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'hltb::getGamesFromHLTB', callback: (game: string, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'hltb::addNewGame', callback: (game: string, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'keywords::save', callback: (item: Readonly<Required<KeywordInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'polls::save' | 'polls::close', callback: (item: Readonly<Required<Poll>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'ranks::save', callback: (item: Readonly<Required<RankInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'timers::save', callback: (item: Readonly<Required<TimerInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'cmdboard::save' | 'cmdboard::remove', callback: (items: Readonly<Required<CommandsBoardInterface>> & Readonly<Required<CommandsBoardInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'eventlist::removeById', callback: (id: string | string[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'viewers::save' | 'viewers::remove', callback: (item: Readonly<Required<UserInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'find.viewers', callback: (opts:  { exactUsernameFromTwitch?: boolean, state?: any; search?: string; filter?: { subscribers: null | boolean; followers: null | boolean; active: null | boolean; vips: null | boolean }; page: number; order?: { orderBy: string; sortOrder: 'ASC' | 'DESC' } }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'watched::save', callback: (item: Readonly<Required<VariableWatchInterface>> & Readonly<Required<VariableWatchInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'songs::save', callback: (item: Readonly<Required<SongPlaylistInterface>> & Readonly<Required<SongPlaylistInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'raffle::setEligibility', callback: (opts: {id: string, isEligible: boolean}, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'price::save', callback: (item: Readonly<Required<PriceInterface>> & Readonly<Required<PriceInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'panel::availableWidgets' | 'panel::dashboards', callback: (opts: { userId: number; type: DashboardInterface['type'] }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'panel::dashboards::remove', callback: (opts: { userId: number; type: DashboardInterface['type'], id: string }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'panel::dashboards::create', callback: (opts: { userId: number, name: string }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'panel::alerts', callback: (cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'lists.set', callback: (opts: { blacklist: string[]; whitelist: string[] }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'purgeAllConnections', callback: (cb: (error: Error | string | null) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'pubg::searchForPlayerId', callback: (opts: { apiKey: string, platform: typeof PUBG.platform, playerName: string }, cb: (error: Error | string | null, data: any) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'pubg::searchForseasonId', callback: (opts: { apiKey: string, platform: typeof PUBG.platform, playerName: string }, cb: (error: Error | string | null, data: any) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'pubg::getUserStats', callback: (opts: { apiKey: string, platform: typeof PUBG.platform, playerId: string, seasonId: string, ranked: boolean }, cb: (error: Error | string | null, data: any) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'pubg::exampleParse', callback: (opts: { text: string }, cb: (error: Error | string | null, data: any) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'alerts::areAlertsMuted', callback: (areAlertsMuted: boolean, cb: (error: Error | string | null, data: any) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'alerts::isTTSMuted', callback: (isTTSMuted: boolean, cb: (error: Error | string | null, data: any) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'alerts::isSoundMuted', callback: (isSoundMuted: boolean, cb: (error: Error | string | null, data: any) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'import.playlist', callback: (opts: {playlist: string, forcedTag: string}, cb: (error: Error | string | null, data: any) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'import.video', callback: (opts: {playlist: string, forcedTag: string}, cb: (error: Error | string | null, data: any) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'get.playlist.tags', callback: (cb: (error: Error | string | null, data: string[]) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'set.playlist.tag', callback: (tag:string, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'integration::obswebsocket::listScene', callback: (cb: (error: Error | string | null, data: ObsWebSocket.Scene[]) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'integration::obswebsocket::listSources', callback: (cb: (error: Error | string | null, scenes: any, types: any) => void, socket: Socket) => void): void;
function adminEndpoint (nsp: string, on: 'integration::obswebsocket::test', callback: (item: OBSWebsocketInterface['simpleModeTasks'] | string, cb: (error: Error | string | null) => void, socket: Socket) => void): void;

// generic functions
function adminEndpoint (nsp: string, on: string, callback: (opts: { [x: string]: any }, cb?: (error: Error | string | null, ...response: any) => void) => void, socket?: Socket): void;
function adminEndpoint (nsp: string, on: string, callback: (cb?: (error: Error | string | null, ...response: any) => void) => void, socket?: Socket): void;
function adminEndpoint (nsp: any, on: any, callback: any): void{
  endpoints.push({
    nsp, on, callback, type: 'admin',
  });
}

const viewerEndpoint = (nsp: string, on: string, callback: (opts: any, cb: (error: Error | string | null, ...response: any) => void) => void, socket?: Socket) => {
  endpoints.push({
    nsp, on, callback, type: 'viewer',
  });
};

function publicEndpoint (nsp: string, on: string, callback: (opts: any, cb: (error: Error | string | null, ...response: any) => void) => void, socket?: Socket) {
  endpoints.push({
    nsp, on, callback, type: 'public',
  });
}

export {
  endpoints, adminEndpoint, viewerEndpoint, publicEndpoint,
};