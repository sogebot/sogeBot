const fs = require('fs');
const child_process = require('child_process')

let status = 0

async function test() {
  await new Promise((resolve) => {
    const p = child_process.spawn('npx', [
      'typeorm',
      'migration:run'
    ], {
      shell: true,
    });
    p.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    p.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    p.on('close', (code) => {
      status = code;
      resolve();
    });
  });

  let output = '';
  const expectedOutput = 'No changes in database schema were found - cannot generate a migration. To create a new empty migration use "typeorm migration:create" command\n';
  await new Promise(async (resolve) => {
    const p = child_process.spawn('npx', [
      'typeorm',
      'migration:generate',
      '-n',
      'test'
    ], {
      shell: true,
    });
    p.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
      output += data.toString()
    });

    p.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    p.on('close', () => {
      resolve();
    });
  });
  if (output !== expectedOutput) {
    await new Promise((resolve2) => {
      const cat = child_process.spawn('cat', [
        './src/bot/database/migration/*/*test*',
      ], {
        shell: true,
      });
      console.log('\n =================================== generated migration file  =================================== \n')
      cat.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
      });
      cat.on('close', () => {
        resolve2();
      });
    })
  };
  process.exit(output === expectedOutput ? 0 : 1);
}

test();