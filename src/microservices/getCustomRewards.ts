import {
  isMainThread, parentPort, Worker,
} from 'worker_threads';

import axios from 'axios';
import {
  createConnection,
  getConnection,
  getConnectionOptions,
  getRepository,
} from 'typeorm';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';

import { Settings } from '../database/entity/settings';
import { getClientId, getToken } from '../helpers/api';
import type { rateHeaders } from '../helpers/api/calls';
import {
  debug, error, setDEBUG, warning,
} from '../helpers/log';
import { TypeORMLogger } from '../helpers/logTypeorm.js';

type CustomRewardEndpoint = { data: { broadcaster_name: string; broadcaster_id: string; id: string; image: string | null; background_color: string; is_enabled: boolean; cost: number; title: string; prompt: string; is_user_input_required: false; max_per_stream_setting: { is_enabled: boolean; max_per_stream: number; }; max_per_user_per_stream_setting: { is_enabled: boolean; max_per_user_per_stream: number }; global_cooldown_setting: { is_enabled: boolean; global_cooldown_seconds: number }; is_paused: boolean; is_in_stock: boolean; default_image: { url_1x: string; url_2x: string; url_4x: string; }; should_redemptions_skip_request_queue: boolean; redemptions_redeemed_current_stream: null | number; cooldown_expires_at: null | string; }[] };
type getCustomRewardReturn = { headers: rateHeaders; method: string; response: CustomRewardEndpoint | null; status: number | string; url: string; error?: Error };

const isThreadingEnabled = process.env.THREAD !== '0';

export const getCustomRewards = async (): Promise<getCustomRewardReturn> => {
  debug('microservice', 'getCustomRewards::isThreadingEnabled ' + isThreadingEnabled);
  debug('microservice', 'getCustomRewards::isMainThread ' + isMainThread);
  debug('microservice', 'getCustomRewards::start');

  if (isMainThread) {
    debug('microservice', 'getCustomRewards::getConnection');
    const connection = await getConnection();
    // spin up worker
    if (connection.options.type !== 'better-sqlite3' && isThreadingEnabled) {
      debug('microservice', 'getCustomRewards::worker');
      const value = await new Promise((resolve, reject) => {
        const worker = new Worker(__filename);
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          debug('microservice', 'getCustomRewards::exit with code ' + code);
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
      return value as unknown as getCustomRewardReturn;
    }
  } else {
    if (process.env.DEBUG) {
      setDEBUG(process.env.DEBUG);
    }
    debug('microservice', 'getCustomRewards::createConnection');
    const connectionOptions = await getConnectionOptions();
    if (['mysql', 'mariadb'].includes(connectionOptions.type)) {
      try {
        await createConnection({
          ...connectionOptions,
          logging:       ['error'],
          logger:        new TypeORMLogger(),
          synchronize:   false,
          migrationsRun: false,
          charset:       'UTF8MB4_GENERAL_CI',
          entities:      [ 'dest/database/entity/*.js' ],
        } as MysqlConnectionOptions);
      } catch (e) {
        if (e instanceof Error) {
          if (!e.message.includes('it now has an active connection session')) {
            error(`getCustomRewards: ${e.stack}`);
          }
        }
      }
    } else {
      try {
        await createConnection({
          ...connectionOptions,
          logging:       ['error'],
          logger:        new TypeORMLogger(),
          synchronize:   false,
          migrationsRun: false,
          entities:      [ 'dest/database/entity/*.js' ],
        });
      } catch (e) {
        if (e instanceof Error) {
          if (!e.message.includes('it now has an active connection session')) {
            error(`getCustomRewards: ${e.stack}`);
          }
        }
      }
    }
  }
  try {
    const channelId = JSON.parse((await getRepository(Settings).findOneOrFail({ name: 'channelId' })).value);

    const url = 'https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=' + channelId;
    const request = await axios.get<CustomRewardEndpoint>(url, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + await getToken('broadcaster'),
        'Client-ID':     await getClientId('broadcaster'),
      },
      timeout: 20000,
    });

    const toReturn = {
      headers:  request.headers as any,
      method:   request.config.method?.toUpperCase() ?? 'GET',
      response: request.data,
      status:   request.status,
      url,
    } as const;
    debug('microservice', 'return::getCustomRewards');
    debug('microservice', toReturn);
    if (!isMainThread) {
      parentPort?.postMessage(toReturn);
    }
    return toReturn;
  } catch (e: any) {
    debug('microservice', 'getCustomRewards::error - ' + JSON.stringify(e));
    if (e.message.includes('channelId')) {
      e.message = 'You need to set your channel first.';
      warning('Microservice getCustomRewards ended with error: You need to set your channel first.');
    }

    const errors = {
      403: 'Microservice getCustomRewards ended with error: Forbidden: Channel Points are not available for the broadcaster',
      404: 'Not Found: No Custom Rewards with the specified IDs were found',
    } as const;

    if (e.response && Object.keys(errors).includes(String(e.response.status))) {
      warning(errors[e.response.status as keyof typeof errors]);
      const toReturn = {
        headers:  e.response.headers,
        url:      e.config.url,
        method:   e.config.method.toUpperCase(),
        status:   e.response.status,
        response: null,
      } as const;

      debug('microservice', 'getCustomRewards::return');
      debug('microservice', toReturn);
      if (!isMainThread) {
        parentPort?.postMessage(toReturn);
      }
      return toReturn;
    } else if (e.isAxiosError) {
      warning('Microservice getCustomRewards ended with error: unknown HTTP request error');
      const toReturn = {
        headers:  e.response.headers,
        url:      e.config.url,
        method:   e.config.method.toUpperCase(),
        status:   e.response.status ?? 'n/a',
        response: null,
      } as const;

      debug('microservice', 'getCustomRewards::return');
      debug('microservice', toReturn);
      if (!isMainThread) {
        parentPort?.postMessage(toReturn);
      }
      return toReturn;
    } else {
      warning('Microservice getCustomRewards ended with error: unknown error');
      const toReturn = {
        headers:  e.response.headers,
        url:      e.config.url,
        method:   e.config.method.toUpperCase(),
        status:   e.response.status ?? 'n/a',
        response: e.response.data,
        error:    e,
      } as const;

      debug('microservice', 'getCustomRewards::return');
      debug('microservice', toReturn);
      if (!isMainThread) {
        parentPort?.postMessage(toReturn);
      }
      return toReturn;
    }
  } finally {
    setTimeout(() => {
      if (!isMainThread) {
        debug('microservice', 'getCustomRewards::kill');
        process.exit(0);
      }
    }, 100);
  }
};

if (!isMainThread) {
  // init if not master
  getCustomRewards();
}