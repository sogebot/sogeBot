const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { spawnSync } = require('child_process');


const argv = require('yargs') // eslint-disable-line
  .usage('node tools/changelog.js <cmd> [args]')
  .command('cli [commit]', 'create changelog between commits/tags', (yargs) => {
    yargs.demandOption(['commit'], 'Please provide commit or tag argument to work with this tool');
    yargs.positional('commit', {
      type: 'string',
      describe: 'commit(preferred) or tag interval e.g. 9.0.3 or 9.0.2..9.0.3'
    });
  })
  .demandCommand()
  .help()
  .argv;

if (argv._[0] === 'cli') {
  const changesSpawn = spawnSync('git', ['log', argv.commit, '--oneline']);
  let changes = changesSpawn.stdout.toString().split('\n');
  // sort alphabetically
  changes.sort((a, b) => {
    const i = a.indexOf(' ');
    const i2 = b.indexOf(' ');
    a = a.slice(i+1).trim();
    b = b.slice(i2+1).trim();
    if(a < b) { return -1; }
    if(a > b) { return 1; }
    return 0;
  });
  // split commit and message and add fixes
  changes = changes.map(o => {
    const i = o.indexOf(' ');
    const commit = o.slice(0, i).trim()

    const body = spawnSync('git', ['log', commit, '-n', '1', '--pretty=format:%B']);
    const fixesRegexp = /(Fixes|Closes|Fixed|Closed)\s(\#\d*)/gmi;
    const fixesRegexpForum = /(Fixes|Closes|Fixed|Closed)\s(.*)/gmi;
    let fixes = []
    if (body.stdout.toString().match(fixesRegexp)) {
      fixes = body.stdout.toString().match(fixesRegexp)
    } else if (body.stdout.toString().match(fixesRegexpForum)) {
      const text = body.stdout.toString().match(fixesRegexpForum)[0]
      const link = text.split(' ')[1];
      const number = link.match(/\d*$/)[0];

      fixes = [
        `Fixes [community#${number}](${link})`
      ]
    }

    return { commit, message: o.slice(i+1).trim(), fixes };
  });
  // filter to have only fix and feat
  changes = changes.filter(o => {
    return o.message.startsWith('fix') || o.message.startsWith('feat');
  });

  if (changes.filter(o => o.message.startsWith('fix')).length > 0) {
    // print out bugfixes
    console.log('### Bug Fixes\n');
    for (const change of changes.filter(o => o.message.startsWith('fix'))) {
      console.log(prepareMessage(change));
    }
    console.log('');
  }

  if (changes.filter(o => o.message.startsWith('feat')).length > 0) {
    // print out bugfixes
    console.log('### Features\n');
    for (const change of changes.filter(o => o.message.startsWith('feat'))) {
      console.log(prepareMessage(change));
    }
    console.log('');
  }
}

function prepareMessage(change) {
  const regexp = /(fix|feat)\((?<type>\w*)\)\: (?<message>.*)/;
  const match = regexp.exec(change.message);
  try {
    return `* **${match.groups.type}** - ${match.groups.message}${change.fixes.length > 0 ? ', ' + change.fixes.join(', ') : ''} ([${change.commit}](https://github.com/sogehige/sogeBot/commit/${change.commit}))`;
  } catch (e) {
    return `* ${change.message} [${change.commit}](https://github.com/sogehige/sogeBot/commit/${change.commit}))`;
  }
}
