import dotenv from 'dotenv';
dotenv.config();

import child_process from 'child_process'
import fs from 'fs'

let status = 0;
async function retest() {
  const file = fs.readFileSync('report').toString();
  const regexp = /^ {2}\d\)(.*)$/gm;
  const match = file.match(regexp);

  if (match) {
    for (const suite of new Set(match.map((o) => {
      return o.trim().split(/\d\) /)[1];
    }))) {
      await new Promise((resolve) => {
        console.log('------------------------------------------------------------------------------');
        console.log('\tRemoving sogebot.db file');
        console.log('------------------------------------------------------------------------------');
        if (fs.existsSync('./sogebot.db')) {
          fs.unlinkSync('./sogebot.db');
        }

        console.log('------------------------------------------------------------------------------');
        console.log('\t=> Re-Running ' + suite + ' tests');
        console.log('------------------------------------------------------------------------------');
        const p = child_process.spawn('npx', [
          'nyc',
          '--clean=false',
          'mocha',
          '-r', 'tsconfig-paths/register',
          '-r', 'source-map-support/register',
          '--timeout', '1200000',
          '--exit',
          '--fgrep="' + suite + '"',
          '--recursive',
          'test/',
        ], { shell: true, env: process.env });

        let output = '';
        p.stdout.on('data', (data) => {
          process.stdout.write(data.toString());
          output += data.toString();
        });

        p.stderr.on('data', (data) => {
          process.stderr.write(data.toString());
          output += data.toString();
        });

        p.on('close', (code) => {
          if (status === 0) {
            status = code;
          }
          if (code !== 0 || output.includes(' 0 passing')) {
            status = 1; // force status 1
            console.log('------------------------------------------------------------------------------');
            console.log('\t=> Failed ' + suite + ' tests');
            console.log('------------------------------------------------------------------------------');
          } else {
            console.log('------------------------------------------------------------------------------');
            console.log('\t=> OK ' + suite + ' tests');
            console.log('------------------------------------------------------------------------------');
          }
          resolve();
        });
      });
    }
  } else {
    if (status === 1) {
      console.log('\n\n Didn\'t found any tests to rerun, but still got some error during test run');
    } else {
      console.log('\n\t No tests to rerun :)\n\n');
    }
  }

  console.log('------------------------------------------------------------------------------');
  console.log('\t=> Merging coverage.json');
  console.log('------------------------------------------------------------------------------');
  child_process.spawnSync('npx', [
    'nyc',
    'merge',
    './.nyc_output/',
    './coverage/coverage-final.json',
  ], { shell: true, env: process.env });
  process.exit(status);
}

async function test() {
  await new Promise((resolve) => {
    let p;
    if (process.env.TESTS) {
      p = child_process.spawn('npx', [
        'nyc',
        '--reporter=json',
        '--clean=false',
        'mocha',
        '-r', 'source-map-support/register',
        '--timeout', '1200000',
        '--grep="' + process.env.TESTS + '"',
        '--exit',
        '--recursive',
        'test/',
      ], { shell: true, env: process.env });
    } else {
      // run all default behavior
      p = child_process.spawn('npx', [
        'nyc',
        '--reporter=json',
        '--clean=false',
        'mocha',
        '-r', 'source-map-support/register',
        '--timeout', '1200000',
        '--exit',
        '--recursive',
        'test/',
      ], { shell: true, env: process.env });
    }

    const report = fs.createWriteStream('report');
    p.stdout.on('data', (data) => {
      report.write(data.toString());
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

  if(status !== 0) {
    status = 0; // reset status for retest
    retest();
  } else {
    process.exit(0);
  }
}

test();