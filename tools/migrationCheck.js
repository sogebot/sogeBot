import {exec, spawn } from 'child_process'

import dotenv from 'dotenv';
dotenv.config();

import { getMigrationType } from '../dest/helpers/getMigrationType.js';

async function test() {
  await new Promise((resolve, reject) => {
    try {
      exec('npx typeorm migration:run -d dest/database.js', {
        env: {
          ...process.env,
          'TYPEORM_ENTITIES':   'dest/database/entity/*.js',
          'TYPEORM_MIGRATIONS': `dest/database/migration/${getMigrationType(process.env.TYPEORM_CONNECTION)}/**/*.js`,
        },
      }, (error, stdout, stderr) => {
        process.stdout.write(stdout);
        process.stderr.write(stderr);
        if (error) {
          reject(error);
          process.stderr.write(error);
          process.exit(1);
        }
        resolve();
      });
    } catch(e) {
      reject();
    }
  });

  const out2 = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', 'typeorm migration:generate -d dest/database.js --ch ./'.split(' '), {
    env: {
      ...process.env,
      'TYPEORM_ENTITIES':   'dest/database/entity/*.js',
      'TYPEORM_MIGRATIONS': `dest/database/migration/${getMigrationType(process.env.TYPEORM_CONNECTION)}/**/*.js`,
    },
  });

  out2.stdout.on('data', function(msg){
    console.log(`${msg}`);
  });
  out2.stderr.on('data', function(msg){
    console.error(`${msg}`);
  });

  out2.on('exit', code => process.exit(code));
}

test();