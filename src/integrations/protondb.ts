import { capitalize, noop } from 'lodash-es';
import fetch from 'node-fetch';
import trigramSimilarity from 'trigram-similarity';

import System from './_interface.js';
import { command, default_permission } from '../decorators.js';
import { Expects } from  '../expects.js';

import {
  stats,
} from '~/helpers/api/index.js';
import { prepare } from '~/helpers/commons/index.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';

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
      type response = {
        bestReportedTier: string;
        tier: string;
        score: number;
        confidence: string;
        total: number;
        trendingTier: string;
      };
      const reqProtonSummary = await new Promise<response>((resolve, reject) => {
        fetch(`https://www.protondb.com/api/v1/reports/summaries/${id}.json`)
          .then(response => response.json() as Promise<response>)
          .then(json => resolve(json))
          .catch(e => reject(e));
      });

      // to get platforms
      type response2 = {
        [x: string]: {
          data: {
            type: string
            name: string
            steam_appid: number
            required_age: string
            is_free: boolean
            controller_support: string
            dlc: Array<number>
            detailed_description: string
            about_the_game: string
            short_description: string
            supported_languages: string
            header_image: string
            capsule_image: string
            capsule_imagev5: string
            website: string
            pc_requirements: {
              minimum: string
              recommended: string
            }
            mac_requirements: Array<any>
            linux_requirements: Array<any>
            legal_notice: string
            developers: Array<string>
            publishers: Array<string>
            price_overview: {
              currency: string
              initial: number
              final: number
              discount_percent: number
              initial_formatted: string
              final_formatted: string
            }
            packages: Array<number>
            package_groups: Array<{
              name: string
              title: string
              description: string
              selection_text: string
              save_text: string
              display_type: number
              is_recurring_subscription: string
              subs: Array<{
                packageid: number
                percent_savings_text: string
                percent_savings: number
                option_text: string
                option_description: string
                can_get_free_license: string
                is_free_license: boolean
                price_in_cents_with_discount: number
              }>
            }>
            platforms: {
              windows: boolean
              mac: boolean
              linux: boolean
            }
            metacritic: {
              score: number
              url: string
            }
            categories: Array<{
              id: number
              description: string
            }>
            genres: Array<{
              id: string
              description: string
            }>
            screenshots: Array<{
              id: number
              path_thumbnail: string
              path_full: string
            }>
            movies: Array<{
              id: number
              name: string
              thumbnail: string
              webm: {
                '480': string
                max: string
              }
              mp4: {
                '480': string
                max: string
              }
              highlight: boolean
            }>
            recommendations: {
              total: number
            }
            achievements: {
              total: number
              highlighted: Array<{
                name: string
                path: string
              }>
            }
            release_date: {
              coming_soon: boolean
              date: string
            }
            support_info: {
              url: string
              email: string
            }
            background: string
            background_raw: string
            content_descriptors: {
              ids: Array<any>
              notes: any
            }
          }
        }
      };
      const reqProtonDetail = await new Promise<response2>((resolve, reject) => {
        fetch(`https://www.protondb.com/proxy/steam/api/appdetails/?appids=${id}`)
          .then(response => response.json() as Promise<response2>)
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
