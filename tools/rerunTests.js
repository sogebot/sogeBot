const fs = require('fs');
const child_process = require('child_process')

const file = fs.readFileSync('report').toString();
const regexp = /^  \d\)(.*)$/gm
let match = file.match(regexp)

let status = 0
async function retest() {
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
          '-r',  'module-alias/register',
          '--timeout', '20000',
          '--exit',
          '--grep="' + suite + '"',
          '--recursive',
          'test/'
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
          if (code !== 0) {
            status = code;
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
    console.log('\n\t No tests to rerun :)\n\n')
  }

  process.exit(status);
}

retest();