import { eventEmitter } from '../events/index.js';

let latestLevel = 1 as number;
let total = 0;
let goal = 0;

let isStarted = false;
const subs = new Map<string, string>();

let lastContributionTotal = 0;
let lastContributionType = 'bits' as 'bits' | 'subscription';
let lastContributionUserId = null as null | string;
let lastContributionUserName = null as null | string;

let topContributionsBitsTotal = 0;
let topContributionsBitsUserId = null as null | string;
let topContributionsBitsUserName = null as null | string;
let topContributionsSubsTotal = 0;
let topContributionsSubsUserId = null as null | string;
let topContributionsSubsUserName = null as null | string;

function setIsStarted(value: boolean) {
  isStarted = value;
  if (!value) {
    subs.clear();
  }
}

async function setCurrentLevel(level: number) {
  if (level > latestLevel && level > 1) {
    let waitForNextLevel = false;
    while(latestLevel < level) {
      if (waitForNextLevel) {
        // wait for a while before new level is triggered
        await new Promise((resolve) => setTimeout(() => resolve(true), 10000));
      }
      waitForNextLevel = true;
      latestLevel++;

      eventEmitter.emit('hypetrain-level-reached', {
        level: latestLevel,
        total,
        goal,

        topContributionsBitsUserId:   topContributionsBitsUserId ? topContributionsBitsUserId : 'n/a',
        topContributionsBitsUsername: topContributionsBitsUserName ? topContributionsBitsUserName : 'n/a',
        topContributionsBitsTotal,

        topContributionsSubsUserId:   topContributionsSubsUserId ? topContributionsSubsUserId : 'n/a',
        topContributionsSubsUsername: topContributionsSubsUserName ? topContributionsSubsUserName : 'n/a',
        topContributionsSubsTotal,

        lastContributionTotal,
        lastContributionType,
        lastContributionUserId:   lastContributionUserId ? lastContributionUserId : 'n/a',
        lastContributionUsername: lastContributionUserName ? lastContributionUserName : 'n/a',
      });
    }
  }
}

function getCurrentLevel() {
  return latestLevel;
}

function setLastContribution(total_: typeof lastContributionTotal, type: typeof lastContributionType, userId: typeof lastContributionUserId, username: typeof lastContributionUserName) {
  lastContributionTotal = total_;
  lastContributionType = type;
  lastContributionUserId = userId;
  lastContributionUserName = username;
}

function setTopContributions(type: 'bits' | 'subscription', total_: typeof lastContributionTotal, userId: typeof topContributionsBitsUserId, username: typeof lastContributionUserName) {
  if (type === 'bits') {
    topContributionsBitsTotal = total_;
    topContributionsBitsUserId = userId;
    topContributionsBitsUserName = username;
  } else {
    topContributionsSubsTotal = total_;
    topContributionsSubsUserId = userId;
    topContributionsSubsUserName = username;
  }
}

function setTotal(value: number) {
  total = value;
}

function setGoal(value: number) {
  goal = value;
}

async function triggerHypetrainEnd() {
  setIsStarted(false);
  eventEmitter.emit('hypetrain-ended', {
    level: latestLevel,
    total,
    goal,

    topContributionsBitsUserId:   topContributionsBitsUserId ? topContributionsBitsUserId : 'n/a',
    topContributionsBitsUsername: topContributionsBitsUserName ? topContributionsBitsUserName : 'n/a',
    topContributionsBitsTotal,

    topContributionsSubsUserId:   topContributionsSubsUserId ? topContributionsSubsUserId : 'n/a',
    topContributionsSubsUsername: topContributionsSubsUserName ? topContributionsSubsUserName : 'n/a',
    topContributionsSubsTotal,

    lastContributionTotal,
    lastContributionType,
    lastContributionUserId:   lastContributionUserId ? lastContributionUserId : 'n/a',
    lastContributionUsername: lastContributionUserName ? lastContributionUserName : 'n/a',
  });
}

const addSub = (sub: { username: string, profileImageUrl: string }) => {
  if (isStarted) {
    subs.set(sub.username, sub.profileImageUrl);
  }
};

export {
  addSub,
  subs,
  getCurrentLevel,
  setCurrentLevel,
  setTotal,
  setGoal,
  setTopContributions,
  setLastContribution,
  triggerHypetrainEnd,
  setIsStarted,
};
