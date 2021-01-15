/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv').config();

const exec = require('child_process').exec;
const fs = require('fs');
const os = require('os');
const util = require('util');

const chalk = require('chalk');

const logDir = './logs';

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFile = './logs/migration.log';
try {
  fs.unlinkSync(logFile);
} catch (e) {
  // pass
}

const repo = ['better-sqlite3', 'postgres', 'mysql'];

async function runMigration() {
  if (+process.versions.node.split('.')[0] === 15) {
    fs.writeFileSync(logFile, '✕ Sorry, this app is not supported on Node.js 15.x', { flag: 'a'});
    console.error('✕ Sorry, this app is not supported on Node.js 15.x');
    console.error('\n!!! Node version check FAILED, please check your logs/migration.log for additional information !!! \n');
    process.exit(1);
  }
  if (+process.versions.node.split('.')[0] < 14) {
    fs.writeFileSync(logFile, '✕ Sorry, this app requires Node.js 14.x or later', { flag: 'a'});
    console.error('✕ Sorry, this app requires Node.js 14.x or later');
    console.error('\n!!! Node version check FAILED, please check your logs/migration.log for additional information !!! \n');
    process.exit(1);
  } else {
    console.log(chalk.green('✓ Node version check OK.'));
    fs.writeFileSync(logFile, '✓ Node version check OK.' + os.EOL + os.EOL, { flag: 'a'});
  }

  // check if TYPEORM_CONNECTION is better-sqlite3, mysql or postgres
  try {
    if (process.env.TYPEORM_CONNECTION) {
      if (!repo.includes(process.env.TYPEORM_CONNECTION)) {
        throw new Error(process.env.TYPEORM_CONNECTION);
      }
    } else {
      throw new Error('-- not set --');
    }

    console.log(chalk.green('✓ TYPEORM_CONNECTION check OK.'));
    fs.writeFileSync(logFile, '✓ TYPEORM_CONNECTION check OK.' + os.EOL + os.EOL, { flag: 'a'});
  } catch (e) {
    console.error(chalk.red(`✕ Incompatible TYPEORM_CONNECTION=${e.message} found. Available options: ${repo.join(', ')}`));
    fs.writeFileSync(logFile, `✕ Incompatible TYPEORM_CONNECTION=${e.message} found. Available options: ${repo.join(', ')}` + os.EOL + os.EOL, { flag: 'a'});
    console.error('\n!!! TYPEORM_CONNECTION version check FAILED, please check your logs/migration.log for additional information !!! \n');
    process.exit(1);
  }

  console.log('\n... Migration in progress, please wait (see logs/migration.log for progress and error) ...');
  exec('typeorm migration:run', (error, stdout, stderr) => {
    fs.writeFileSync(logFile, stdout + os.EOL, { flag: 'a'});
    fs.writeFileSync(logFile, stderr + os.EOL, { flag: 'a'});

    if(error) {
      fs.writeFileSync(logFile, error + os.EOL, { flag: 'a'});
      console.error('\n!!! Migration FAILED, please check your logs/migration.log for additional information !!! \n');
      process.exit(1);
    } else {
      console.log('\n ... Migration done\n');
      process.exit(0);
    }
  });
}
runMigration();
/*
typeorm migration:run
*/
