/* eslint-disable @typescript-eslint/no-var-requires */

const os = require('os');
const fs = require('fs');
const logDir = './logs';

const util = require('util');
const exec = require('child_process').exec;

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFile = fs.createWriteStream('./logs/migration.log', { flags: 'w' });
console.log('... Migration in progress, please wait (see logs/migration.log for progress and error) ...');

async function runMigration() {
  exec('typeorm migration:run', (error, stdout, stderr) => {
    logFile.write(stdout + os.EOL);
    logFile.write(stderr + os.EOL);

    if(error) {
      logFile.write(error + os.EOL);
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
