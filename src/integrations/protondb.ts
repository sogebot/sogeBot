import { capitalize, noop } from 'lodash';
import fetch from 'node-fetch';
import trigramSimilarity from 'trigram-similarity';

import { command, default_permission } from '../decorators';
import Expects from '../expects';
import System from './_interface';

import {
  stats,
} from '~/helpers/api';
import { prepare } from '~/helpers/commons';
import defaultPermissions from '~/helpers/permissions/defaultPermissions';

const cache = new Map<string, string>();

class ProtonDB extends System {
  @command('!pdb')
  @default_permission(defaultPermissions.CASTERS)
  async getGameInfo(opts: CommandOptions): Promise<CommandResponse[]> {
    let [gameInput] = new Expects(opts.parameters)
      .everything({ optional: true })
      .toArray();

    if (!gameInput) {
      if (!stats.value.currentGame) {
        return []; // skip if we don't have game
      } else {
        gameInput = stats.value.currentGame;
      }
    }

    let id: string | null = null;
    if (cache.has(gameInput.toLowerCase())) {
      id = cache.get(gameInput.toLowerCase()) as string;
    } else {
      const request = await new Promise((resolve, reject) => {
        fetch('http://api.steampowered.com/ISteamApps/GetAppList/v0002/')
          .then(response => response.json())
          .then(json => resolve(json))
          .catch(e => reject(e));
      });

      const apps = new Map<number, any>();
      (request as any).applist.apps.forEach((o: any) => {
        const similarity = trigramSimilarity(o.name.toLowerCase(), gameInput.toLowerCase());
        if (similarity >= 0.75) {
          apps.set(similarity, o);
        }
      });

      // select most similar game
      const key = [...apps.keys()].sort().reverse()[0];
      const app = apps.get(key);

      if (app) {
        id = app.appid as string;
        cache.set(gameInput.toLowerCase(), id);
      }
    }

    if (!id) {
      return [{
        response: prepare('integrations.protondb.responseNotFound', {
          game: gameInput.toUpperCase(),
        }),
        ...opts,
      }];
    }

    try {
      const reqProtonSummary = await new Promise<{
        bestReportedTier: string;
        tier: string;
        score: number;
        confidence: string;
        total: number;
        trendingTier: string;
      }>((resolve, reject) => {
        fetch(`https://www.protondb.com/api/v1/reports/summaries/${id}.json`)
          .then(response => response.json())
          .then(json => resolve(json))
          .catch(e => reject(e));
      });

      // to get platforms
      const reqProtonDetail = await new Promise<any>((resolve, reject) => {
        fetch(`https://www.protondb.com/proxy/steam/api/appdetails/?appids=${id}`)
          .then(response => response.json())
          .then(json => resolve(json))
          .catch(e => reject(e));
      });

      let rating = capitalize(reqProtonSummary.tier);
      const native: string[] = [];

      reqProtonDetail[id].data.platforms.linux ? native.push('Linux') : noop();
      reqProtonDetail[id].data.platforms.mac ? native.push('Mac') : noop();
      reqProtonDetail[id].data.platforms.windows ? native.push('Windows') : noop();

      if (native.length === 3) {
        rating = 'Native';
      }

      return [{
        response: prepare('integrations.protondb.responseOk', {
          game:   reqProtonDetail[id].data.name.toUpperCase(),
          rating,
          native: native.join(', '),
          url:    `https://www.protondb.com/app/${id}`,
        }),
        ...opts,
      }];
    } catch (e) {
      return [{
        response: prepare('integrations.protondb.responseNg', {
          game: gameInput.toUpperCase(),
        }),
        ...opts,
      }];
    }
  }
}

export default new ProtonDB();
