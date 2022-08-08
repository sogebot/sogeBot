const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
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
          process.stderr.write(error);
          process.exit(1);
        }
        resolve();
      });
    } catch(e) {
      reject();
    }
  });

  const expectedOutput = 'No changes in database schema were found - cannot generate a migration. To create a new empty migration use "typeorm migration:create" command\n';
  try {
    await new Promise((resolve, reject) => {

      const out2 = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', 'typeorm migration:generate -n generatedMigration'.split(' '), {
        env: {
          ...process.env,
          'TYPEORM_ENTITIES':   'dest/database/entity/*.js',
          'TYPEORM_MIGRATIONS': `dest/database/migration/${getMigrationType(process.env.TYPEORM_CONNECTION)}/**/*.js`,
        },
      });

      out2.stdout.on('data', function(msg){
        const value = msg.toString();
        if (value === expectedOutput) {
          resolve();
        }
        if (value.includes('generated successfully')) {
          reject();
        }
      });
    });
    process.exit(0);
  } catch {
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
    process.exit(1);
  }
}

test();