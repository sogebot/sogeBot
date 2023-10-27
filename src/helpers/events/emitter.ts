import { EventSubChannelGoalType } from '@twurple/eventsub-base/lib/events/common/EventSubChannelGoalType';
import { TypedEmitter } from 'tiny-typed-emitter';

import { Types } from '~/plugins/ListenTo.js';

export interface Events {
  'CustomVariable:OnRefresh': () => void;
  [Types.CustomVariableOnChange]: (variableName: string, cur: any, prev: any) => void;
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
    level: number, total: number, goal: number,
    topContributionsBitsUserId: string; topContributionsBitsUsername: string; topContributionsBitsTotal: number;
    topContributionsSubsUserId: string; topContributionsSubsUsername: string; topContributionsSubsTotal: number;
    lastContributionType: 'bits' | 'subscription'; lastContributionUserId: string; lastContributionUsername: string; lastContributionTotal: number;
  }) => void;
  'hypetrain-level-reached': (opts: {
    level: number, total: number, goal: number,
    topContributionsBitsUserId: string; topContributionsBitsUsername: string; topContributionsBitsTotal: number;
    topContributionsSubsUserId: string; topContributionsSubsUsername: string; topContributionsSubsTotal: number;
    lastContributionType: 'bits' | 'subscription'; lastContributionUserId: string; lastContributionUsername: string; lastContributionTotal: number;
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
  'highlight': (opts: {userId: string, message: string}) => void;
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
  // OBS Websocket integration
  'obs-scene-changed': (opts: { sceneName: string, linkFilter: string }) => void;
  'obs-input-mute-state-changed': (opts: { inputName: string; inputMuted: boolean; linkFilter: string }) => void;
  // Channel Charity
  [Types.onChannelCharityCampaignProgress]: (opts: {
    broadcasterDisplayName: string;
    broadcasterId: string;
    broadcasterName: string;
    charityDescription: string;
    charityLogo: string;
    charityWebsite: string;
    charityName: string;
    currentAmount: number;
    currentAmountCurrency: string;
    targetAmount: number;
    targetAmountCurrency: string;
  }) => void;
  [Types.onChannelCharityCampaignStart]: (opts: Parameters<Events[Types.onChannelCharityCampaignProgress]>[0] & { startDate: string }) => void;
  [Types.onChannelCharityCampaignStop]: (opts: Parameters<Events[Types.onChannelCharityCampaignProgress]>[0] & { endDate: string }) => void;
  [Types.onChannelCharityDonation]: (opts: {
    broadcasterDisplayName: string;
    broadcasterId: string;
    broadcasterName: string;
    charityDescription: string;
    charityLogo: string;
    charityWebsite: string;
    charityName: string;
    campaignId: string;
    donorDisplayName: string;
    donorId: string;
    donorName: string;
    amount: number;
    amountCurrency: string;
  }) => void;
  [Types.onChannelGoalBegin]: (opts: {
    broadcasterDisplayName: string;
    broadcasterId: string;
    broadcasterName: string;
    currentAmount: number;
    description: string;
    startDate: string;
    targetAmount: number;
    type: EventSubChannelGoalType;
  }) => void;
  [Types.onChannelGoalProgress]: (opts: {
    broadcasterDisplayName: string;
    broadcasterId: string;
    broadcasterName: string;
    currentAmount: number;
    description: string;
    startDate: string;
    targetAmount: number;
    type: EventSubChannelGoalType;
  }) => void;
  [Types.onChannelGoalEnd]: (opts: {
    broadcasterDisplayName: string;
    broadcasterId: string;
    broadcasterName: string;
    currentAmount: number;
    description: string;
    startDate: string;
    endDate: string;
    targetAmount: number;
    type: EventSubChannelGoalType;
    isAchieved: boolean;
  }) => void;
  [Types.onChannelModeratorAdd]: (opts: {
    broadcasterDisplayName: string;
    broadcasterId: string;
    broadcasterName: string;
    userDisplayName: string;
    userId: string;
    userName: string;
  }) => void;
  [Types.onChannelModeratorRemove]: Events[Types.onChannelModeratorAdd];
  [Types.onChannelRewardAdd]: (opts: {
    broadcasterDisplayName: string;
    broadcasterId: string;
    broadcasterName: string;
    autoApproved: boolean;
    backgroundColor: string;
    cooldownExpiryDate: string | null;
    cost: number;
    globalCooldown: number | null;
    id: string;
    isEnabled: boolean;
    isInStock: boolean;
    isPaused: boolean;
    maxRedemptionsPerStream: number | null;
    maxRedemptionsPerUserPerStream: number | null;
    prompt: string;
    redemptionsThisStream: number | null;
    title: string;
    userInputRequired: boolean;
  }) => void;
  [Types.onChannelRewardRemove]: Events[Types.onChannelRewardAdd];
  [Types.onChannelRewardUpdate]: Events[Types.onChannelRewardAdd];
  [Types.onChannelShieldModeBegin]: (opts: {
    broadcasterDisplayName: string,
    broadcasterId:          string,
    broadcasterName:        string,
    moderatorDisplayName:   string,
    moderatorId:            string,
    moderatorName:          string,
  }) => void;
  [Types.onChannelShieldModeEnd]: (opts: Parameters<Events[Types.onChannelShieldModeBegin]>[0] & { endDate: string }) => void;
  [Types.onChannelShoutoutCreate]: (opts: {
    broadcasterDisplayName: string,
    broadcasterId:          string,
    broadcasterName:        string,
    moderatorDisplayName:   string,
    moderatorId:            string,
    moderatorName:          string,
    cooldownEndDate:                  string;
    shoutedOutBroadcasterDisplayName: string;
    shoutedOutBroadcasterId:          string;
    shoutedOutBroadcasterName:        string;
    startDate:                        string;
    viewerCount:                      number;
  }) => void;
  [Types.onChannelShoutoutReceive]: (opts: {
    broadcasterDisplayName: string,
    broadcasterId:          string,
    broadcasterName:        string,
    startDate:                        string;
    viewerCount:                      number;
    shoutingOutBroadcasterDisplayName: string,
    shoutingOutBroadcasterId:          string,
    shoutingOutBroadcasterName:        string,
  }) => void;
  [Types.onChannelUpdate]: (opts: {
    broadcasterDisplayName: string,
    broadcasterId:          string,
    broadcasterName:        string,
    categoryId: string;
    categoryName: string;
    isMature: boolean;
    streamLanguage: string;
    streamTitle: string;
  }) => void;
  [Types.onUserUpdate]: (opts: {
    userDescription: string;
    userDisplayName: string;
    userId: string;
    userEmail: string | null;
    userEmailIsVerified: boolean | null;
    userName: string;
  }) => void;
  [Types.onChannelRaidFrom]: (opts: {
    raidedBroadcasterDisplayName: string;
    raidedBroadcasterName: string;
    raidedBroadcasterId: string;
    raidingBroadcasterDisplayName: string;
    raidingBroadcasterName: string;
    raidingBroadcasterId: string;
    viewers: number;
  }) => void;
  [Types.onChannelRedemptionUpdate]: (opts: {
    broadcasterDisplayName: string;
    broadcasterId: string;
    broadcasterName: string;
    id: string;
    input: string;
    redemptionDate: string;
    rewardCost: number;
    rewardId: string;
    rewardPrompt: string;
    rewardTitle: string;
    status: string;
    userDisplayName: string;
    userId: string;
    userName: string;
  }) => void;
}

class _EventEmitter extends TypedEmitter<Events> {}
const eventEmitter = new _EventEmitter();

export { eventEmitter };
