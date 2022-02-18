/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv').config();

const spawn = require('child_process').spawn;
const fs = require('fs');
const os = require('os');

const { dayjs, timezone } = require('@sogebot/ui-helpers/dayjsHelper');
const chalk = require('chalk');

const getMigrationType = require('../src/helpers/getMigrationType').getMigrationType;
const { migrationFile } = require('../src/helpers/log');

const logDir = './logs';

try {
  fs.accessSync('./', fs.constants.R_OK | fs.constants.W_OK);
  console.log(chalk.green(`✓ Read/Write permissions check`));
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir);
      console.log(chalk.green(`✓ created folder for logfiles`));
    } catch (error) {
      console.error(`✕ No read or write permission in ${logDir}\n${error}`);
      process.exit(1);
    }
  }
} catch (err) {
  console.error(`✕ No read or write permission in bot root folder\ncheck your file permissions\n${err}`);
  process.exit(1);
}

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const repo = ['better-sqlite3', 'postgres', 'mysql'];

migrationFile.write(`====================== ${dayjs().tz(timezone).format('YYYY-MM-DD[T]HH:mm:ss.SSS')} ======================\n`);

async function runMigration() {
  if (+process.versions.node.split('.')[0] < 16) {
    migrationFile.write('✕ Sorry, this app requires Node.js 16.x or later');
    console.error('✕ Sorry, this app requires Node.js 16.x or later');
    console.error('\n!!! Node version check FAILED, please check your logs/migration.log for additional information !!! \n');
    process.exit(1);
  } else {
    console.log(chalk.green('✓ Node version check OK.'));
    migrationFile.write('✓ Node version check OK.' + os.EOL + os.EOL);
  }

  // check if TYPEORM_CONNECTION is better-sqlite3, mysql or postgres
  try {
    if (process.env.TYPEORM_CONNECTION) {
      if (!repo.includes(process.env.TYPEORM_CONNECTION)) {
        throw new Error(process.env.TYPEORM_CONNECTION);
      }
    } else {
      throw new Error('-- not set --');
    }

    console.log(chalk.green('✓ TYPEORM_CONNECTION check OK.'));
    migrationFile.write('✓ TYPEORM_CONNECTION check OK.' + os.EOL + os.EOL);
  } catch (e) {
    console.error(chalk.red(`✕ Incompatible TYPEORM_CONNECTION=${e.message} found. Available options: ${repo.join(', ')} \n[!] Lookup the Documentation about Configuration Database`));
    migrationFile.write(`✕ Incompatible TYPEORM_CONNECTION=${e.message} found. Available options: ${repo.join(', ')} \n[!] Lookup the Documentation about Configuration Database` + os.EOL + os.EOL);
    console.error('\n!!! TYPEORM_CONNECTION version check FAILED, please check your logs/migration.log for additional information !!! \n');
    process.exit(1);
  }

  console.log('\n... Migration in progress, please wait (see logs/migration.log for progress and error) ...');

  const exitCode = await new Promise(resolve => {
    const migration = spawn('npx',  ['typeorm', 'migration:run'], {
      shell: true,
      env:   {
        ...process.env,
        'TYPEORM_ENTITIES':   'src/database/entity/*.js',
        'TYPEORM_MIGRATIONS': `src/database/migration/${getMigrationType(process.env.TYPEORM_CONNECTION)}/**/*.js`,
      },
    }).on('error', function( err ){
      throw err;
    });
    migration.stdout.on('data', (data) => {
      migrationFile.write(data);
    });

    migration.stderr.on('data', (data) => {
      migrationFile.write(data);
    });

    migration.on('close', (code) => {
      resolve(code);
    });
  });

  if (exitCode !== 0) {
    console.error('\n!!! Migration FAILED, please check your logs/migration.log for additional information !!! \n');
  } else {
    console.log('\n ... Migration done\n');
  }
  process.exit(exitCode);
}
runMigration();
