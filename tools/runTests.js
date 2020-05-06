const fs = require('fs');
const child_process = require('child_process')

let status = 0
async function retest() {
  const file = fs.readFileSync('report').toString();
  const regexp = /^  \d\)(.*)$/gm
  let match = file.match(regexp)

  if (match) {
    for (let suite of new Set(match.map((o) => {
      return o.trim().split(/\d\) /)[1]
    }))) {
      await new Promise((resolve) => {
        console.log('------------------------------------------------------------------------------')
        console.log('\t=> Re-Running ' + suite + ' tests')
        console.log('------------------------------------------------------------------------------')
        const p = child_process.spawn('npx', [
          'mocha',
          '-r', 'source-map-support/register',
          '--timeout', '60000',
          '--exit',
          '--grep="' + suite.replace('(!#)', '') + '"',
          '--recursive',
          'test/'
        ], {
          shell: true,
        });

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
            console.log('------------------------------------------------------------------------------')
            console.log('\t=> Failed ' + suite + ' tests')
            console.log('------------------------------------------------------------------------------')
          } else {
            console.log('------------------------------------------------------------------------------')
            console.log('\t=> OK ' + suite + ' tests')
            console.log('------------------------------------------------------------------------------')
          }
          resolve();
        });
      })
    }
  } else {
    if (status === 1) {
      console.log('\n\n Didn\'t found any tests to rerun, but still got some error during test run');
    } else {
      console.log('\n\t No tests to rerun :)\n\n')
    }
  }
  process.exit(status);
}

async function test() {
  await new Promise((resolve) => {
    const p = child_process.spawn('npx', [
      'mocha',
      '-r', 'source-map-support/register',
      '--timeout', '60000',
      '--exit',
      '--recursive',
      'test/'
    ], {
      shell: true,
    });

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
  })

  if(status !== 0) {
    status = 0; // reset status for retest
    retest();
  } else {
    process.exit(0);
  }
}

test();