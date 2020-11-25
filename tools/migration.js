/* eslint-disable @typescript-eslint/no-var-requires */

const os = require('os');
const fs = require('fs');
const logDir = './logs';

const util = require('util');
const exec = require('child_process').exec;

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFile = './logs/migration.log';
try {
  fs.unlinkSync(logFile);
} catch (e) {
  // pass
}

async function runMigration() {
  if (+process.versions.node.split('.')[0] < 14) {
    fs.writeFileSync(logFile, 'Sorry, this app requires Node.js 14.x or later', { flag: 'a'});
    console.error('Sorry, this app requires Node.js 14.x or later');
    console.error('\n!!! Pre-run check FAILED, please check your logs/migration.log for additional information !!! \n');
    process.exit(1);
  } else {
    console.log('Pre-run check OK.\n');
    fs.writeFileSync(logFile, 'Pre-run check OK.' + os.EOL + os.EOL, { flag: 'a'});
  }

  console.log('... Migration in progress, please wait (see logs/migration.log for progress and error) ...');
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
