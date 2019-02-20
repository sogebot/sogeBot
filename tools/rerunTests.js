const fs = require('fs');
const child_process = require('child_process')

const file = fs.readFileSync('report').toString();
const regexp = /^  \d\)(.*)$/gm
const match = file.match(regexp)

let status = 0

if (match) {
  for (let m of match) {
    const suite = m.trim().split(/\d\) /)[1]
    console.log('\n\t Re-Running ' + suite + ' tests')
    const p = child_process.spawnSync('npx', [
      'mocha',
      '--timeout', '20000',
      '--exit',
      '--grep="' + suite + '"',
      '--recursive',
      'test/'
    ], {
      shell: true,
    });

    if (p.status === 1) {
      status = 1;
      console.log('\t   !!! Failed again :(')
    } else {
      console.log('\t   !!! Tests OK! :)')
    }
  }
} else {
  console.log('\n\t No tests to rerun')
}

process.exit(status)