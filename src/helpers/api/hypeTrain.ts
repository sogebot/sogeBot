import { eventEmitter } from '../events';

let latestLevel = 1 as 1 | 2 | 3 | 4 | 5;
let total = 0;
let goal = 0;

let lastContributionTotal = 0;
let lastContributionType = 'bits' as 'bits' | 'subs';
let lastContributionUserId = null as null | string;
let lastContributionUserName = null as null | string;

let topContributionsBitsTotal = 0;
let topContributionsBitsUserId = null as null | string;
let topContributionsBitsUserName = null as null | string;
let topContributionsSubsTotal = 0;
let topContributionsSubsUserId = null as null | string;
let topContributionsSubsUserName = null as null | string;

async function setCurrentLevel(level: 1 | 2 | 3 | 4 | 5) {
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
        level: latestLevel as 1 | 2 | 3 | 4 | 5,
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

function setTopContributions(type: 'bits' | 'subs', total_: typeof lastContributionTotal, userId: typeof topContributionsBitsUserId, username: typeof lastContributionUserName) {
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

export {
  getCurrentLevel,
  setCurrentLevel,
  setTotal,
  setGoal,
  setTopContributions,
  setLastContribution,
  triggerHypetrainEnd,
};
