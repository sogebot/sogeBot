import _ from 'lodash';
import safeEval from 'safe-eval';
import { getRepository } from 'typeorm';

import api from '../api';
import { isBot, isBroadcaster, isModerator, isOwner, isSubscriber, isVIP } from '../commons';
import customvariables from '../customvariables';
import { User } from '../database/entity/user';
import ranks from '../systems/ranks';

export const checkFilter = async (opts: CommandOptions | ParserOptions, filter: string): Promise<boolean> => {
  if (typeof filter === 'undefined' || filter.trim().length === 0) {
    return true;
  }
  const toEval = `(function evaluation () { return ${filter} })()`;

  const $userObject = await getRepository(User).findOne({ userId: Number(opts.sender.userId) });
  if (!$userObject) {
    await getRepository(User).save({
      userId: Number(opts.sender.userId),
      username: opts.sender.username,
    });
    return checkFilter(opts, filter);
  }
  let $rank: string | null = null;
  if (ranks.enabled) {
    const rank = await ranks.get($userObject);
    $rank = typeof rank.current === 'string' || rank.current === null ? rank.current : rank.current.rank;
  }

  const $is = {
    moderator: isModerator($userObject),
    subscriber: isSubscriber($userObject),
    vip: isVIP($userObject),
    broadcaster: isBroadcaster(opts.sender.username),
    bot: isBot(opts.sender.username),
    owner: isOwner(opts.sender.username),
  };

  const customVariables = customvariables.getAll();
  const context = {
    $source: typeof opts.sender.discord === 'undefined' ? 'twitch' : 'discord',
    $sender: opts.sender.username,
    $is,
    $rank,
    $haveParam: opts.parameters.length > 0,
    // add global variables
    $game: api.stats.currentGame || 'n/a',
    $language: api.stats.language || 'en',
    $title: api.stats.currentTitle || 'n/a',
    $views: api.stats.currentViews,
    $followers: api.stats.currentFollowers,
    $hosts: api.stats.currentHosts,
    $subscribers: api.stats.currentSubscribers,
    ...customVariables,
  };
  let result = false;
  try {
    result = safeEval(toEval, {...context, _});
  } catch (e) {
    // do nothing
  }
  return !!result; // force boolean
};
