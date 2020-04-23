require('dotenv').config();

Error.stackTraceLimit = Infinity;

if (Number(process.versions.node.split('.')[0]) < 11) {
  process.stdout.write('Upgrade your version of NodeJs! You need at least NodeJs 11.0.0, https://nodejs.org/en/. Current version is ' + process.versions.node + '\n');
  process.exit(1);
}

import 'reflect-metadata';

import { debug, error, info, warning } from './helpers/log';

import { createConnection, getConnectionOptions } from 'typeorm';

import figlet from 'figlet';
import util from 'util';
import _ from 'lodash';
import gitCommitInfo from 'git-commit-info';
import { init as clusterInit, isMainThread } from './cluster';

import { changelog } from './changelog';
import { autoLoad } from './commons';
import chalk from 'chalk';
import { existsSync, unlinkSync } from 'fs';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { normalize } from 'path';
import { startWatcher } from './watchers';

import { expose as panelExpose, init as panelInit } from './panel';
import { setIsBotStarted } from './helpers/database';

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
      type,
      logging: ['error'],
      ...connectionOptions,
      synchronize: false,
      migrationsRun: true,
      charset: 'UTF8_GENERAL_CI',
    } as MysqlConnectionOptions);
  } else {
    await createConnection({
      type,
      logging: ['error'],
      ...connectionOptions,
      synchronize: false,
      migrationsRun: true,
    });
  }
  const typeToLog = {
    sqlite: 'SQLite3',
    mariadb: 'MySQL/MariaDB',
    mysql: 'MySQL/MariaDB',
    postgres: 'PostgreSQL',
  };
  await new Promise( resolve => setTimeout(resolve, 3000) );
  info(`Initialized ${typeToLog[type]} database (${normalize(String(connectionOptions.database))})`);
};

async function main () {
  try {
    const version = _.get(process, 'env.npm_package_version', 'x.y.z');
    if (!existsSync('./restart.pid')) {
      process.stdout.write(figlet.textSync('sogeBot ' + version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'), {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      }));
      process.stdout.write('\n\n\n');
      info('Bot is starting up');
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
      clusterInit();
      changelog();
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
      translate = require('./translate');
      require('./oauth');
      require('./webhooks');
      require('./api');
      translate.default._load().then(async () => {
        await autoLoad('./dest/stats/');
        await autoLoad('./dest/registries/');
        await autoLoad('./dest/systems/');
        await autoLoad('./dest/widgets/');
        await autoLoad('./dest/overlays/');
        await autoLoad('./dest/games/');
        await autoLoad('./dest/integrations/');

        if (isMainThread) {
          panelExpose();
        }

        if (process.env.HEAP) {
          warning(chalk.bgRed.bold('HEAP debugging is ENABLED'));
          setTimeout(() => require('./heapdump.js').init('heap/'), 120000);
        }

        // load tmi last
        require('./tmi');

        setTimeout(() => {
          if (existsSync('./restart.pid')) {
            unlinkSync('./restart.pid');
          }
          startWatcher();
          setIsBotStarted();
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

process.on('uncaughtException', (err) => {
  const date = new Date().toISOString();
  process.report?.writeReport(`uncaughtException-${date}`, err);
  error(util.inspect(err));
  error('');
  error('BOT HAS UNEXPECTEDLY CRASHED');
  error('PLEASE CHECK https://github.com/sogehige/SogeBot/wiki/How-to-report-an-issue');
  error(`AND ADD ${process.cwd()}/logs/uncaughtException-${date}.json file to your report`);
  error('');
  process.exit(1);
});