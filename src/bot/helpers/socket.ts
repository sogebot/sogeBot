import type { VariableInterface, VariableWatchInterface } from '../database/entity/variable';
import type { PermissionsInterface } from '../database/entity/permissions';
import type { TextInterface } from '../database/entity/text';
import type { EventInterface } from '../database/entity/event';
import type { GoalGroupInterface } from '../database/entity/goal';
import type { AlertInterface, AlertMediaInterface } from '../database/entity/alert';
import type { RandomizerInterface } from '../database/entity/randomizer';
import type { CooldownInterface } from '../database/entity/cooldown';
import type { HowLongToBeatGameInterface } from '../database/entity/howLongToBeatGame';
import type { KeywordInterface } from '../database/entity/keyword';
import type { RankInterface } from '../database/entity/rank';
import type { TimerInterface } from '../database/entity/timer';
import type { CommandsBoardInterface } from '../database/entity/commands';
import type { UserInterface } from '../database/entity/user';
import type { SongPlaylistInterface } from '../database/entity/song';
import type { RaffleParticipantInterface } from '../database/entity/raffle';
import type { PriceInterface } from '../database/entity/price';
import type { DashboardInterface } from '../database/entity/dashboard';

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
  | 'list.watch' | 'broadcaster' | 'configuration' | 'raffle:getLatest' | 'lists.get'
  | 'bets::getCurrentBet' | 'commands::count' | 'getLatestStats' | 'menu' | 'panel::errors'
  | 'removeCache' | 'testExplosion' | 'testFireworks' | 'test' | 'discord::authorize'
  | 'discord::getChannels' | 'discord::getRoles' | 'discord::getGuilds' | 'settings'
  | 'panel.sendStreamData',
  callback: (cb: (error: Error | string | null, ...response: any) => void) => void | Promise<void>): void;

// id + cb
function adminEndpoint (
  nsp: string,
  on: 'generic::getOne' | 'generic::deleteById' | 'customvariables::runScript' | 'customvariables::delete'
  | 'test.event' | 'alerts::deleteMedia' | 'alerts::getOneMedia' | 'randomizer::showById'
  | 'eventlist::resend' | 'viewers::followedAt',
  callback: (id: string | number, cb: (error: Error | string | null, ...response: any) => void) => void): void;

// string + cb
function adminEndpoint (
  nsp: string,
  on: 'chat.message.send' | 'import.ban' | 'import.video' | 'songs::removeRequest' | 'delete.playlist' | 'delete.ban'
  | 'import.playlist' | 'raffle::getWinner' | 'raffle::open' | 'parseCron'
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
function adminEndpoint (nsp: string, on: 'eventlist::getUserEvents', callback: (username: string, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'customvariables::list', callback: (cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'customvariables::testScript', callback: (opts: { currentValue: any; evalValue: any }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'customvariables::isUnique', callback: (opts: { variable: any; id: any }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'customvariables::save', callback: (item: Readonly<Required<VariableInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'permission::insert', callback: (data: Readonly<Required<PermissionsInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'permission::update::order', callback: (opts: { id: string; order: number }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'permission::save', callback: (data: Readonly<Required<PermissionsInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'permissions', callback: (cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'permission::order', callback: (data: { id: string; order: number}[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'test.user', callback: (opts: { value: string | number; pid: string; state: any }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'text::remove' | 'text::save', callback: (item: Readonly<Required<TextInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'events::remove' | 'events::save', callback: (item: Readonly<Required<EventInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'carousel::save', callback: (items: Readonly<Required<EventInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'carousel::insert', callback: (data: string, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'goals::remove' | 'goals::save', callback: (item: Readonly<Required<GoalGroupInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'alerts::saveMedia', callback: (item: Readonly<Required<AlertMediaInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'alerts::save' | 'alerts::delete', callback: (item: Readonly<Required<AlertInterface>>, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'randomizer::save' | 'randomizer::remove', callback: (item: Readonly<Required<RandomizerInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'cooldown::save', callback: (item: Readonly<Required<CooldownInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'hltb::save', callback: (item: Readonly<Required<HowLongToBeatGameInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'keywords::save', callback: (item: Readonly<Required<KeywordInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'polls::save' | 'polls::close', callback: (item: Readonly<Required<Poll>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'ranks::save', callback: (item: Readonly<Required<RankInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'timers::save', callback: (item: Readonly<Required<TimerInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'cmdboard::save' | 'cmdboard::remove', callback: (items: Readonly<Required<CommandsBoardInterface>> & Readonly<Required<CommandsBoardInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'eventlist::removeById', callback: (id: string | string[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'viewers::save' | 'viewers::remove', callback: (item: Readonly<Required<UserInterface>> & Readonly<Required<RandomizerInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'find.viewers', callback: (opts:  { state?: any; search?: string; filter?: { subscribers: null | boolean; followers: null | boolean; active: null | boolean; vips: null | boolean }; page: number; order?: { orderBy: string; sortOrder: 'ASC' | 'DESC' } }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'watched::save', callback: (item: Readonly<Required<VariableWatchInterface>> & Readonly<Required<VariableWatchInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'songs::save', callback: (item: Readonly<Required<SongPlaylistInterface>> & Readonly<Required<SongPlaylistInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'raffle::updateParticipant', callback: (item: Readonly<Required<RaffleParticipantInterface>> & Readonly<Required<RaffleParticipantInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'price::save', callback: (item: Readonly<Required<PriceInterface>> & Readonly<Required<PriceInterface>>[], cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'panel::availableWidgets' | 'panel::dashboards', callback: (opts: { userId: number; type: DashboardInterface['type'] }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'panel::dashboards::remove', callback: (opts: { userId: number; type: DashboardInterface['type'], id: string }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'panel::dashboards::create', callback: (opts: { userId: number, name: string }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'lists.set', callback: (opts: { blacklist: string[]; whitelist: string[] }, cb: (error: Error | string | null, ...response: any) => void) => void): void;
function adminEndpoint (nsp: string, on: 'purgeAllConnections', callback: (cb: (error: Error | string | null) => void, socket: SocketIO.Socket) => void): void;

// generic functions
function adminEndpoint (nsp: string, on: string, callback: (opts: { [x: string]: any }, cb?: (error: Error | string | null, ...response: any) => void) => void, socket?: SocketIO.Socket): void;
function adminEndpoint (nsp: string, on: string, callback: (cb?: (error: Error | string | null, ...response: any) => void) => void, socket?: SocketIO.Socket): void;
function adminEndpoint (nsp: any, on: any, callback: any): void{
  endpoints.push({ nsp, on, callback, type: 'admin' });
}

const viewerEndpoint = (nsp: string, on: string, callback: (opts: any, cb: (error: Error | string | null, ...response: any) => void) => void, socket?: SocketIO.Socket) => {
  endpoints.push({ nsp, on, callback, type: 'viewer' });
};
const publicEndpoint = (nsp: string, on: string, callback: (opts: any, cb: (error: Error | string | null, ...response: any) => void) => void, socket?: SocketIO.Socket) => {
  endpoints.push({ nsp, on, callback, type: 'public' });
};

export { endpoints, adminEndpoint, viewerEndpoint, publicEndpoint };