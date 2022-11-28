import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'prediction-started': (opts: {
    titleOfPrediction: string,
    outcomes: string,
    locksAt: string,
  }) => void;
  'prediction-locked': (opts: {
    titleOfPrediction: string,
    outcomes: string,
    locksAt: string,
  }) => void;
  'prediction-ended': (opts: {
    titleOfPrediction: string,
    outcomes: string,
    locksAt: string,
    winningOutcomeTitle: string;
    winningOutcomeTotalPoints: number;
    winningOutcomePercentage: number;
  }) => void;
  'poll-started': (opts: {
    titleOfPoll: string,
    choices: string,
    bitVotingEnabled: boolean,
    bitAmountPerVote: number,
    channelPointsVotingEnabled: boolean,
    channelPointsAmountPerVote: number,
  }) => void;
  'poll-ended': (opts: {
    titleOfPoll: string,
    choices: string,
    votes: number;
    winnerVotes: number;
    winnerPercentage: number;
    winnerChoice: string;
  }) => void;
  'hypetrain-started': () => void;
  'hypetrain-ended': (opts: {
    level: 1 | 2 | 3 | 4 | 5, total: number, goal: number,
    topContributionsBitsUserId: string; topContributionsBitsUsername: string; topContributionsBitsTotal: number;
    topContributionsSubsUserId: string; topContributionsSubsUsername: string; topContributionsSubsTotal: number;
    lastContributionType: 'bits' | 'subs'; lastContributionUserId: string; lastContributionUsername: string; lastContributionTotal: number;
  }) => void;
  'hypetrain-level-reached': (opts: {
    level: 1 | 2 | 3 | 4 | 5, total: number, goal: number,
    topContributionsBitsUserId: string; topContributionsBitsUsername: string; topContributionsBitsTotal: number;
    topContributionsSubsUserId: string; topContributionsSubsUsername: string; topContributionsSubsTotal: number;
    lastContributionType: 'bits' | 'subs'; lastContributionUserId: string; lastContributionUsername: string; lastContributionTotal: number;
  }) => void;
  'action': (opts: { userName: string; source: 'discord' | 'twitch' }) => void;
  'commercial': (opts: { duration: number }) => void;
  'game-changed': (opts: {oldGame: string, game: string}) => void;
  'follow': (opts: {userName: string, userId: string}) => void;
  'cheer': (opts: {userName: string, userId: string, bits: number, message: string}) => void;
  'user-joined-channel': (opts: {userName: string}) => void;
  'user-parted-channel': (opts: {userName: string}) => void;
  'subcommunitygift': (opts: {userName: string; count: number}) => void;
  'reward-redeemed': (opts: {userId: string; userName: string; rewardId: string; userInput: string;}) => void;
  'timeout': (opts: {userName: string; duration: number}) => void;
  'ban': (opts: {userName: string; reason: string}) => void;
  'raid': (opts: {userName: string, hostViewers: number, event: string, timestamp: number}) => void;
  'stream-started': () => void;
  'stream-stopped': () => void;
  'subscription': (opts: { userName: string; method: string; subCumulativeMonths: number; tier: string}) => void;
  'resub': (opts: { userName: string; subStreakShareEnabled: boolean, subStreak: number; subStreakName: string; subCumulativeMonthsName: string; message: string; subCumulativeMonths: number; tier: string}) => void;
  'clearchat': () => void;
  'command-send-x-times': (opts: { reset: boolean } | { userName: string, message: string, source: 'discord' | 'twitch' }) => void;
  'keyword-send-x-times': (opts: { reset: boolean } | { userName: string, message: string, source: 'discord' | 'twitch' }) => void;
  'chatter-first-message': (opts: { userName: string, message: string, source: 'twitch' }) => void;
  'every-x-minutes-of-stream': (opts: { reset: boolean }) => void;
  'stream-is-running-x-minutes': (opts: { reset: boolean }) => void;
  'subgift': (opts: { userName: string; recipient: string; tier: number; }) => void;
  'number-of-viewers-is-at-least-x': (opts: { reset: boolean }) => void;
  'tip': (opts: { isAnonymous: boolean, userName: string, amount: string; currency: string; amountInBotCurrency: string; currencyInBot: string; message: string; }) => void;
  // Twitter integration
  'tweet-post-with-hashtag': (opts: { tweet: any }) => void;
  // OBS Websocket integration
  'obs-scene-changed': (opts: { sceneName: string, linkFilter: string }) => void;
  'obs-input-mute-state-changed': (opts: { inputName: string; inputMuted: boolean; linkFilter: string }) => void;
}

class _EventEmitter extends TypedEmitter<Events> {}
const eventEmitter = new _EventEmitter();

export { eventEmitter };