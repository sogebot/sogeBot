import client from '../api/client';

import { error } from '~/helpers/log';

async function sendGameFromTwitch (game: string) {
  try {
    const clientBot = await client('bot');
    const searchCategories = await clientBot.search.searchCategoriesPaginated(game).getAll();
    return searchCategories.map(o => o.name);
  } catch (e: unknown) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
    return;
  }
}

export { sendGameFromTwitch };