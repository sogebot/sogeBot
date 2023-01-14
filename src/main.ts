require('dotenv').config();

Error.stackTraceLimit = Infinity;

import 'reflect-metadata';

import { existsSync, readFileSync, unlinkSync } from 'fs';
import { normalize } from 'path';
import util from 'util';

import blocked from 'blocked-at';
import chalk from 'chalk';
import figlet from 'figlet';
import gitCommitInfo from 'git-commit-info';

import { AppDataSource } from '~/database';

import _ from 'lodash';

import { autoLoad } from '~/helpers/autoLoad';
import { setIsBotStarted, setIsDbConnected } from '~/helpers/database';
import {
  error, info, isDebugEnabled, setDEBUG, warning,
} from '~/helpers/log';
import { startWatcher } from '~/watchers';

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
    const version = _.get(process, 'env.npm_package_version', 'x.y.z');
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
  let translate;
  try {
    // Initialize all core singletons
    setTimeout(() => {
      translate = require('./translate');

      translate.default._load().then(async () => {
        require('./general');
        require('./socket');
        require('./ui');
        require('./currency');
        require('./stats');
        require('./users');
        require('./events');
        require('./plugins');
        require('./customvariables');
        require('./permissions');
        require('./updater');
        require('./dashboard');
        require('./tts');
        require('./emotes');
        require('./panel');
        await autoLoad('./dest/stats/');
        await autoLoad('./dest/registries/');
        await autoLoad('./dest/systems/');
        await autoLoad('./dest/widgets/');
        await autoLoad('./dest/overlays/');
        await autoLoad('./dest/games/');
        await autoLoad('./dest/integrations/');
        await autoLoad('./dest/services/');

        if (process.env.HEAP) {
          warning(chalk.bgRed.bold('HEAP debugging is ENABLED'));
          setTimeout(() => require('~/heapdump.js').init('heap/'), 120000);
        }

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

          require('~/inspector');
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