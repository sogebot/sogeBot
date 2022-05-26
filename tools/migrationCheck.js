const exec = require('child_process').exec;
const execSync = require('child_process').execSync;

require('dotenv').config();

const getMigrationType = require('../dest/helpers/getMigrationType').getMigrationType;

async function test() {
  await new Promise((resolve, reject) => {
    try {
      exec('npx typeorm migration:run', {
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
          process.exit(1);
        }
        resolve();
      });
    } catch(e) {
      reject();
    }
  });

  let output = '';
  const expectedOutput = 'No changes in database schema were found - cannot generate a migration. To create a new empty migration use "typeorm migration:create" command\n';
  await new Promise((resolve) => {
    exec('npx typeorm migration:generate -n generatedMigration', {
      env: {
        ...process.env,
        'TYPEORM_ENTITIES':   'dest/database/entity/*.js',
        'TYPEORM_MIGRATIONS': `dest/database/migration/${getMigrationType(process.env.TYPEORM_CONNECTION)}/**/*.js`,
      },
    }, (error, stdout, stderr) => {
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

    if (process.argv[2] === '-d') {
      console.log('Dry run removing generated file.');
      execSync('rm ./*generatedMigration*');
    }
  }
  process.exit(output === expectedOutput ? 0 : 1);
}

test();