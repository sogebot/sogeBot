import _ from 'lodash';
import safeEval from 'safe-eval';

import { timer } from '../decorators.js';
import ranks from '../systems/ranks';
import { isStreamOnline, stats } from './api';
import { getAll } from './customvariables';
import {
  isOwner, isSubscriber, isVIP,
} from './user';
import * as changelog from './user/changelog.js';
import { isBot, isBotSubscriber } from './user/isBot';
import { isBroadcaster } from './user/isBroadcaster';
import { isModerator } from './user/isModerator';

class HelpersFilter {
  @timer()
  async checkFilter(opts: CommandOptions | ParserOptions, filter: string): Promise<boolean> {
    if (!opts.sender) {
      return true;
    }
    const toEval = `(function evaluation () { return ${filter} })()`;

    const $userObject = await changelog.get(opts.sender.userId);
    if (!$userObject) {
      changelog.update(opts.sender.userId, {
        userId:   opts.sender.userId,
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
      moderator:   isModerator($userObject),
      subscriber:  isSubscriber($userObject),
      vip:         isVIP($userObject),
      broadcaster: isBroadcaster(opts.sender.username),
      bot:         isBot(opts.sender.username),
      owner:       isOwner(opts.sender.username),
    };

    const customVariables = await getAll();
    const context = {
      $source:          typeof opts.sender.discord === 'undefined' ? 'twitch' : 'discord',
      $sender:          opts.sender.username,
      $is,
      $rank,
      $haveParam:       opts.parameters?.length > 0,
      $param:           opts.parameters,
      // add global variables
      $game:            stats.value.currentGame || 'n/a',
      $language:        stats.value.language || 'en',
      $title:           stats.value.currentTitle || 'n/a',
      $views:           stats.value.currentViews,
      $followers:       stats.value.currentFollowers,
      $subscribers:     stats.value.currentSubscribers,
      $isBotSubscriber: isBotSubscriber(),
      $isStreamOnline:  isStreamOnline.value,
      ...customVariables,
    };
    let result =  false;
    try {
      result = safeEval(toEval, { ...context, _ });
    } catch (e: any) {
      // do nothing
    }
    return !!result; // force boolean
  }
}
const cl = new HelpersFilter();

export const checkFilter = async (opts: CommandOptions | ParserOptions, filter: string): Promise<boolean> => {
  return cl.checkFilter(opts, filter);
};
