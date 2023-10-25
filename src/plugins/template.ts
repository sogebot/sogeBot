import { getTime } from '@sogebot/ui-helpers/getTime.js';

import {
  chatMessagesAtStart, isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api/index.js';
import { getGlobalVariables } from '~/helpers/checkFilter.js';
import { mainCurrency, symbol } from '~/helpers/currency/index.js';
import { flatten } from '~/helpers/flatten.js';
import { linesParsed } from '~/helpers/parser.js';
import { showWithAt } from '~/helpers/tmi/index.js';

export async function template(message: string, params: Record<string, any>, userstate?: { userName: string; userId: string } | null) {
  if (userstate === null) {
    userstate = undefined;
  }

  params = flatten({
    ...params,
    stream: {
      uptime:             getTime(isStreamOnline.value ? streamStatusChangeSince.value : null, false),
      currentViewers:     stats.value.currentViewers,
      currentSubscribers: stats.value.currentSubscribers,
      currentBits:        stats.value.currentBits,
      currentTips:        stats.value.currentTips,
      currency:           symbol(mainCurrency.value),
      chatMessages:       (isStreamOnline.value) ? linesParsed - chatMessagesAtStart.value : 0,
      currentFollowers:   stats.value.currentFollowers,
      maxViewers:         stats.value.maxViewers,
      newChatters:        stats.value.newChatters,
      game:               stats.value.currentGame,
      tags:               stats.value.currentTags ?? [],
      status:             stats.value.currentTitle,
      currentWatched:     stats.value.currentWatchedTime,
    },
    sender: {
      userName: userstate?.userName,
      userId:   userstate?.userId,
    },
  });
  const regexp = new RegExp(`{ *?(?<variable>[a-zA-Z0-9._]+) *?}`, 'g');
  const match = message.matchAll(regexp);
  for (const item of match) {
    message = message.replace(item[0], params[item[1]]);
  }

  // global variables replacer
  if (!message.includes('$')) {
    // message doesn't have any variables
    return message;
  }

  const variables = await getGlobalVariables(message, { sender: userstate });
  for (const variable of Object.keys(variables)) {
    message = message.replaceAll(variable, String(variables[variable as keyof typeof variables] ?? ''));
  }

  if (userstate) {
    message = message.replace(/\$sender/g, showWithAt ? `@${userstate.userName}` : userstate.userName);
  }
  return message;
}