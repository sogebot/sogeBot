Error.stackTraceLimit = Infinity;

import 'reflect-metadata';

import 'dotenv/config';

import { existsSync, readFileSync, unlinkSync } from 'fs';
import { normalize } from 'path';
import util from 'util';

import blocked from 'blocked-at';
import figlet from 'figlet';
import gitCommitInfo from 'git-commit-info';
import { get } from 'lodash-es';

import { autoLoad } from './helpers/autoLoad.js';
import { isDebugEnabled, setDEBUG } from './helpers/debug.js';
import { startWatcher } from './watchers.js';

import { AppDataSource } from '~/database.js';
import { setIsBotStarted, setIsDbConnected } from '~/helpers/database.js';
import {
  error, info, warning,
} from '~/helpers/log.js';

const connect = async function () {
  const type = process.env.TYPEORM_CONNECTION;
  if (!type) {
    error('Set your db in .env or as ENVIROMNENT VARIABLES');
    process.exit(1);
  }

  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  const typeToLog = {
    'better-sqlite3': 'SQLite3',
    mariadb:          'MySQL/MariaDB',
    mysql:            'MySQL/MariaDB',
    postgres:         'PostgreSQL',
  };
  info(`Initialized ${typeToLog[type as keyof typeof typeToLog]} database (${normalize(String(AppDataSource.options.database))})`);
  setIsDbConnected();
};

async function main () {
  try {
    const version = get(process, 'env.npm_package_version', 'x.y.z');
    const commitFile = existsSync('./.commit') ? readFileSync('./.commit').toString() : null;
    if (!existsSync('~/restart.pid')) {
      const versionString = version.replace('SNAPSHOT', commitFile && commitFile.length > 0 ? commitFile : gitCommitInfo().shortHash || 'SNAPSHOT');
      process.stdout.write(figlet.textSync('sogeBot ' + versionString, {
        font:             'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout:   'default',
      }));
      process.stdout.write('\n\n\n');
      info(`Bot is starting up (Bot version: ${versionString.replace('\n', '')}, NodeJS: ${process.versions.node})`);
      if (process.env.DEBUG) {
        setDEBUG(process.env.DEBUG);
      }
    }
    await connect();
  } catch (e: any) {
    error('Bot was unable to connect to database, check your database configuration');
    error(e);
    error('Exiting bot.');
    process.exit(1);
  }
  try {
    // Initialize all core singletons
    setTimeout(async () => {
      const translate = (await import('./translate.js')).default;

      translate._load().then(async () => {
        await import('./general.js');
        await import('./socket.js');
        await import('./ui.js');
        await import('./currency.js');
        await import('./stats.js');
        await import('./users.js');
        await import('./events.js');
        await import('./plugins.js');
        await import('./customvariables.js');
        await import('./permissions.js');
        await import('./dashboard.js');
        await import('./tts.js');
        await import('./emotes.js');
        await import('./panel.js');
        await autoLoad('./dest/stats/');
        await autoLoad('./dest/registries/');
        await autoLoad('./dest/systems/');
        await autoLoad('./dest/widgets/');
        await autoLoad('./dest/overlays/');
        await autoLoad('./dest/games/');
        await autoLoad('./dest/integrations/');
        await autoLoad('./dest/services/');

        setTimeout(() => {
          if (existsSync('~/restart.pid')) {
            unlinkSync('~/restart.pid');
          }
          setIsBotStarted();
          startWatcher();

          if (isDebugEnabled('eventloop')) {
            warning('EVENTLOOP BLOCK DETECTION ENABLED! This may cause some performance issues.');
            blocked((time: any, stack: any) => {
              error(`EVENTLOOP BLOCK !!! Blocked for ${time}ms, operation started here:`);
              error(stack);
            }, { threshold: 1000 });
          }
        }, 30000);
      });
    }, 5000);
  } catch (e: any) {
    error(e);
    process.exit();
  }
}

main();

process.on('unhandledRejection', function (reason, p) {
  error(`Possibly Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`);
});

process.on('uncaughtException', (err: Error) => {
  const date = new Date().toISOString();
  process.report?.writeReport(`uncaughtException-${date}`, err);
  error(util.inspect(err));
  if (err.message.includes('[TwitchJS] Parse error encountered [Chat]')) {
    // workaround for https://github.com/sogebot/sogeBot/issues/3762
    return;
  }
  error('');
  error('BOT HAS UNEXPECTEDLY CRASHED');
  error('PLEASE CHECK https://github.com/sogebot/sogeBot/wiki/How-to-report-an-issue');
  error(`AND ADD ${process.cwd()}/logs/uncaughtException-${date}.json file to your report`);
  error('');
  process.exit(1);
});