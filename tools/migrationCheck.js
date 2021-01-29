const exec = require('child_process').exec;
const fs = require('fs');

const dotenv = require('dotenv');

const getMigrationType = require('../dest/helpers/getMigrationType').getMigrationType;

const envConfig = dotenv.parse(fs.readFileSync('.env'));
fs.appendFileSync('.env', `\nTYPEORM_MIGRATIONS=dest/database/migration/${getMigrationType(envConfig.TYPEORM_CONNECTION)}/**/*.js`);
fs.appendFileSync('.env', `\nTYPEORM_ENTITIES=dest/database/entity/*.js`);

async function test() {
  await new Promise((resolve) => {
    exec('npx typeorm migration:run', (error, stdout, stderr) => {
      process.stdout.write(stdout);
      resolve();
    });
  });

  let output = '';
  const expectedOutput = 'No changes in database schema were found - cannot generate a migration. To create a new empty migration use "typeorm migration:create" command\n';
  await new Promise(async (resolve) => {
    exec('npx typeorm migration:generate -n generatedMigration', (error, stdout, stderr) => {
      output += stdout;
      resolve();
    });
  });
  console.log(output);
  if (output !== expectedOutput) {
    await new Promise((resolve2) => {
      exec('cat ./*generatedMigration*', (error, stdout, stderr) => {
        console.log('\n =================================== generated migration file  =================================== \n');
        console.log(stdout);
        resolve2();
      });
    });
  }
  process.exit(output === expectedOutput ? 0 : 1);
}

test();