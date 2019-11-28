if (Number(process.versions.node.split('.')[0]) < 11) {
  process.stdout.write('Upgrade your version of NodeJs! You need at least NodeJs 11.0.0, https://nodejs.org/en/. Current version is ' + process.versions.node + '\n');
  process.exit(1);
}

import 'reflect-metadata';
import 'module-alias/register';

import { error, info, warning } from './helpers/log';

import { createConnection, getConnectionOptions } from 'typeorm';

import figlet from 'figlet';
import util from 'util';
import _ from 'lodash';
import gitCommitInfo from 'git-commit-info';
import { isMainThread, init as clusterInit } from './cluster';

import { changelog } from './changelog';
import { autoLoad } from './commons';
import chalk from 'chalk';

const connect = async function () {
  const connectionOptions = await getConnectionOptions();
  await createConnection({
    ...connectionOptions,
  });
};

async function main () {
  if (isMainThread) {
    await connect();
  }
  let translate, panel;
  try {
    clusterInit();
    changelog();

    // Initialize all core singletons
    require('./general');
    require('./socket');
    require('./ui');
    require('./currency');
    require('./stats');
    require('./users');
    require('./events');
    require('./customvariables');
    panel = require('./panel');
    require('./twitch');
    require('./permissions');
    translate = require('./translate');
    require('./oauth');
    require('./webhooks');
    require('./api');
  } catch (e) {
    error(e);
    process.exit();
  }

  const version = _.get(process, 'env.npm_package_version', 'x.y.z');
  process.stdout.write(figlet.textSync('sogeBot ' + version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'), {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  }));
  process.stdout.write('\n\n\n');
  info('Bot is starting up');
  translate.default._load().then(async () => {
    await autoLoad('./dest/stats/');
    await autoLoad('./dest/registries/');
    await autoLoad('./dest/systems/');
    await autoLoad('./dest/widgets/');
    await autoLoad('./dest/overlays/');
    await autoLoad('./dest/games/');
    await autoLoad('./dest/integrations/');

    if (isMainThread) {
      panel.default.expose();
    }

    if (process.env.HEAP) {
      warning(chalk.bgRed.bold('HEAP debugging is ENABLED'));
      setTimeout(() => require('./heapdump.js').init('heap/'), 120000);
    }

    // load tmi last
    require('./tmi');
  });
}

main();

process.on('unhandledRejection', function (reason, p) {
  error(`Possibly Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`);
});

process.on('uncaughtException', (err) => {
  error(util.inspect(err));
  error('+------------------------------------------------------------------------------+');
  error('| BOT HAS UNEXPECTEDLY CRASHED                                                 |');
  error('| PLEASE CHECK https://github.com/sogehige/SogeBot/wiki/How-to-report-an-issue |');
  error('| AND ADD logs/sogebot.log file to your report                                 |');
  error('+------------------------------------------------------------------------------+');
  process.exit(1);
});
