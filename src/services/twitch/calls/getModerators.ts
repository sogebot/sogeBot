import { getRepository, In, Not } from 'typeorm';

import client from '../api/client';

import { User } from '~/database/entity/user';
import { get } from '~/helpers/interfaceEmitter';
import { error, warning } from '~/helpers/log';
import { addUIError } from '~/helpers/panel/';
import { setStatus } from '~/helpers/parser';
import * as changelog from '~/helpers/user/changelog.js';

export async function getModerators(opts: { isWarned: boolean }) {
  try {
    const [ botId, channelId, broadcasterCurrentScopes ] = await Promise.all([
      get<string>('/services/twitch', 'botId'),
      get<string>('/services/twitch', 'channelId'),
      get<string>('/services/twitch', 'broadcasterCurrentScopes'),
    ]);

    if (!broadcasterCurrentScopes.includes('moderation:read')) {
      if (!opts.isWarned) {
        opts.isWarned = true;
        warning('Missing Broadcaster oAuth scope moderation:read to read channel moderators.');
        addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth scope moderation:read to read channel moderators.' });
      }
      return { state: false, opts };
    }

    const clientBot = await client('bot');
    const getModeratorsPaginated = await clientBot.moderation.getModeratorsPaginated(channelId).getAll();

    await changelog.flush();
    await getRepository(User).update({ userId: Not(In(getModeratorsPaginated.map(o => o.userId))) }, { isModerator: false });
    await getRepository(User).update({ userId: In(getModeratorsPaginated.map(o => o.userId)) }, { isModerator: true });

    setStatus('MOD', getModeratorsPaginated.map(o => o.userId).includes(botId));
  } catch (e) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
  }
  return { state: true };
}