require('dotenv').config();

Error.stackTraceLimit = Infinity;

import 'reflect-metadata';

import { existsSync, unlinkSync } from 'fs';
import { normalize } from 'path';
import util from 'util';

import blocked from 'blocked-at';
import chalk from 'chalk';
import figlet from 'figlet';
import gitCommitInfo from 'git-commit-info';
import _ from 'lodash';
import { createConnection, getConnectionOptions } from 'typeorm';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';

import { autoLoad } from './helpers/autoLoad';
import { setIsBotStarted } from './helpers/database';
import { getMigrationType } from './helpers/getMigrationType';
import {
  debug, error, info, isDebugEnabled, setDEBUG, warning,
} from './helpers/log';
import { TypeORMLogger } from './helpers/logTypeorm';
import { expose as panelExpose, init as panelInit } from './panel';
import { startWatcher } from './watchers';

const connect = async function () {
  const connectionOptions = await getConnectionOptions();
  const type = process.env.TYPEORM_CONNECTION;
  if (!type) {
    error('Set your db in .env or as ENVIROMNENT VARIABLES');
    process.exit(1);
  }

  debug('connection', { connectionOptions });

  if (type === 'mysql' || type === 'mariadb') {
    await createConnection({
      ...connectionOptions,
      logging:       ['error'],
      logger:        new TypeORMLogger(),
      synchronize:   false,
      migrationsRun: true,
      charset:       'UTF8MB4_GENERAL_CI',
      entities:      [ 'dest/database/entity/*.js' ],
      migrations:    [ `dest/database/migration/${getMigrationType(connectionOptions.type)}/**/*.js` ],
    } as MysqlConnectionOptions);
  } else {
    await createConnection({
      ...connectionOptions,
      logging:       ['error'],
      logger:        new TypeORMLogger(),
      synchronize:   false,
      migrationsRun: true,
      entities:      [ 'dest/database/entity/*.js' ],
      migrations:    [ `dest/database/migration/${getMigrationType(connectionOptions.type)}/**/*.js` ],
    });
  }
  const typeToLog = {
    'better-sqlite3': 'SQLite3',
    mariadb:          'MySQL/MariaDB',
    mysql:            'MySQL/MariaDB',
    postgres:         'PostgreSQL',
  };
  await new Promise( resolve => setTimeout(resolve, 3000) );
  info(`Initialized ${typeToLog[type as keyof typeof typeToLog]} database (${normalize(String(connectionOptions.database))})`);
};

async function main () {
  try {
    const version = _.get(process, 'env.npm_package_version', 'x.y.z');
    if (!existsSync('./restart.pid')) {
      process.stdout.write(figlet.textSync('sogeBot ' + version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'), {
        font:             'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout:   'default',
      }));
      process.stdout.write('\n\n\n');
      info(`Bot is starting up (NodeJS: ${process.versions.node})`);
      if (process.env.DEBUG) {
        setDEBUG(process.env.DEBUG);
      }
    }
    await connect();
  } catch (e) {
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
        panelInit();
        require('./general');
        require('./socket');
        require('./ui');
        require('./currency');
        require('./stats');
        require('./users');
        require('./events');
        require('./customvariables');
        require('./twitch');
        require('./permissions');
        require('./oauth');
        require('./api');
        require('./pubsub');
        await autoLoad('./dest/stats/');
        await autoLoad('./dest/registries/');
        await autoLoad('./dest/systems/');
        await autoLoad('./dest/widgets/');
        await autoLoad('./dest/overlays/');
        await autoLoad('./dest/games/');
        await autoLoad('./dest/integrations/');

        const tmi = require('./tmi');

        panelExpose();

        if (process.env.HEAP) {
          warning(chalk.bgRed.bold('HEAP debugging is ENABLED'));
          setTimeout(() => require('./heapdump.js').init('heap/'), 120000);
        }

        setTimeout(() => {
          if (existsSync('./restart.pid')) {
            unlinkSync('./restart.pid');
          }
          tmi.default.shouldConnect = true;
          setIsBotStarted();
          startWatcher();

          if (isDebugEnabled('eventloop')) {
            warning('EVENTLOOP BLOCK DETECTION ENABLED! This may cause some performance issues.');
            blocked((time: any, stack: any) => {
              error(`EVENTLOOP BLOCK !!! Blocked for ${time}ms, operation started here:`);
              error(stack);
            }, { threshold: 1000 });
          }

          require('./inspector');
        }, 30000);
      });
    }, 5000);
  } catch (e) {
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
    // workaround for https://github.com/sogehige/sogeBot/issues/3762
    return;
  }
  error('');
  error('BOT HAS UNEXPECTEDLY CRASHED');
  error('PLEASE CHECK https://github.com/sogehige/SogeBot/wiki/How-to-report-an-issue');
  error(`AND ADD ${process.cwd()}/logs/uncaughtException-${date}.json file to your report`);
  error('');
  process.exit(1);
});