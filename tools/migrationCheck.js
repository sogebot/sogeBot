const exec = require('child_process').exec;
const fs = require('fs');

const getMigrationType = require('../dest/helpers/getMigrationType').getMigrationType;

console.log(process.env);
require('dotenv').config();

console.log(process.env);

async function test() {
  await new Promise((resolve) => {
    exec('npx typeorm migration:run', {
      env: {
        'TYPEORM_ENTITIES':   'dest/database/entity/*.js',
        'TYPEORM_MIGRATIONS': `dest/database/migration/${getMigrationType(process.env.TYPEORM_CONNECTION)}/**/*.js`,
      },        shell: true,

    }, (error, stdout, stderr) => {
      console.log({ error, stdout, stderr });
      if (stdout) {
        process.stdout.write(stdout);
      }
      resolve();
    });
  });

  let output = '';
  const expectedOutput = 'No changes in database schema were found - cannot generate a migration. To create a new empty migration use "typeorm migration:create" command\n';
  await new Promise(async (resolve) => {
    exec('npx typeorm migration:generate -n generatedMigration', {
      env: {
        'TYPEORM_ENTITIES':   'dest/database/entity/*.js',
        'TYPEORM_MIGRATIONS': `dest/database/migration/${getMigrationType(process.env.TYPEORM_CONNECTION)}/**/*.js`,
      },        shell: true,

    }, (error, stdout, stderr) => {
      console.log({ error, stdout, stderr });
      output += stdout;
      resolve();
    });
  });
  if (output !== expectedOutput) {
    await new Promise((resolve2) => {
      exec('cat ./*generatedMigration*', {
        shell: true,
      }, (error, stdout, stderr) => {
        console.log({ error, stdout, stderr });
        console.log('\n =================================== generated migration file  =================================== \n');
        console.log(stdout);
        resolve2();
      });
    });
  }
  process.exit(output === expectedOutput ? 0 : 1);
}

test();