const { spawnSync } = require('child_process');

const gitSemverTags = require('git-semver-tags');
const argv = require('yargs') // eslint-disable-line
  .usage('node tools/changelog.js <cmd> [args]')
  .option('escape', {
    description: 'Escapes outpu (useful for github action)',
    type:        'boolean',
  })
  .command('generate', 'generate changelog')
  .command('nextTag', 'get next tag')
  .command('nextTagMajor', 'get next major tag')
  .command('cli [commit]', 'create changelog between commits/tags', (yargs) => {
    yargs.demandOption(['commit'], 'Please provide commit or tag argument to work with this tool');
    yargs.positional('commit', {
      type:     'string',
      describe: 'commit(preferred) or tag interval e.g. 9.0.3 or 9.0.2..9.0.3',
    });
  })
  .demandCommand()
  .help()
  .argv;

if (argv._[0] === 'nextTag') {
  gitSemverTags(function(err, tags) {
    const latestTag = tags[0];

    const changesList = [];
    const changesSpawn = spawnSync('git', ['log', `${latestTag}...HEAD`, '--oneline']);
    changesList.push(...changes(changesSpawn.stdout.toString().split('\n')));

    const [ latestMajorVersion, latestMinorVersion, latestPatchVersion ] = tags[0].split('.');

    if (changesList.includes('### BREAKING CHANGES\n')) {
      process.stdout.write(`${Number(latestMajorVersion)+1}.0.0`);
    } else if (changesList.includes('### Features\n')) {
      // new tag
      process.stdout.write(`${latestMajorVersion}.${Number(latestMinorVersion)+1}.0`);
    } else {
      process.stdout.write(`${latestMajorVersion}.${latestMinorVersion}.${Number(latestPatchVersion)+1}`);
    }
  });
}

if (argv._[0] === 'nextTagMajor') {
  gitSemverTags(function(err, tags) {
    const latestTag = tags[0];

    const changesList = [];
    const changesSpawn = spawnSync('git', ['log', `${latestTag}...HEAD`, '--oneline']);
    changesList.push(...changes(changesSpawn.stdout.toString().split('\n')));

    const [ latestMajorVersion, latestMinorVersion, latestPatchVersion ] = tags[0].split('.');
    process.stdout.write(`${Number(latestMajorVersion)+1}.0.0`);
  });
}

if (argv._[0] === 'nextSnapshot') {
  gitSemverTags(function(err, tags) {
    const [ latestMajorVersion, latestMinorVersion ] = tags[0].split('.');
    process.stdout.write(`${latestMajorVersion}.${Number(latestMinorVersion)+1}.0-SNAPSHOT`);
  });
}

if (argv._[0] === 'generate') {
  gitSemverTags(function(err, tags) {
    const tagsToGenerate = [];
    const [ latestMajorVersion, latestMinorVersion, latestPatchVersion ] = tags[0].split('.');

    for (let i = latestPatchVersion; i >= 0; i--) {
      tagsToGenerate.push(`${latestMajorVersion}.${latestMinorVersion}.${i}`);
    }

    // we need last release before
    const beforeTag = tags[tags.findIndex((val) => val === tagsToGenerate[tagsToGenerate.length - 1]) + 1];
    const majorTagRelease = tagsToGenerate[tagsToGenerate.length - 1];
    const changesList = [];

    // we have minor patches
    if (tagsToGenerate.length > 1) {
      const latestMinorTag = tagsToGenerate[0];

      // get change between new and last versions
      changesList.push(`## ${latestMinorTag}\n\n`);
      let changesSpawn;
      if (tagsToGenerate[tagsToGenerate.length - 2] === latestMinorTag) {
        changesSpawn = spawnSync('git', ['log', `${majorTagRelease}...${latestMinorTag}`, '--oneline']);
      } else {
        changesSpawn = spawnSync('git', ['log', `${tagsToGenerate[1]}...${latestMinorTag}`, '--oneline']);
      }
      changesList.push(...changes(changesSpawn.stdout.toString().split('\n')));
    }

    // major patch changelog
    let changesSpawn;
    if (tagsToGenerate.length > 1 && tagsToGenerate[1] !== majorTagRelease) {
      changesList.push(`## ${latestMajorVersion}.${latestMinorVersion}.0 - ${tagsToGenerate[1]}\n\n`);
      changesSpawn = spawnSync('git', ['log', `${beforeTag}...${tagsToGenerate[1]}`, '--oneline']);
    } else {
      changesList.push(`## ${latestMajorVersion}.${latestMinorVersion}.0\n\n`);
      changesSpawn = spawnSync('git', ['log', `${beforeTag}...${majorTagRelease}`, '--oneline']);
    }
    changesList.push(...changes(changesSpawn.stdout.toString().split('\n')));

    for (const output of changesList) {
      for (const line of output) {
        process.stdout.write(sanitizeLine(line));
      }
    }
  });
}

if (argv._[0] === 'cli') {
  const changesSpawn = spawnSync('git', ['log', argv.commit, '--oneline']);
  for (const output of changes(changesSpawn.stdout.toString().split('\n'))) {
    process.stdout.write(sanitizeLine(output));
  }
}

function changes(changesList) {
  // sort alphabetically
  changesList.sort((a, b) => {
    const i = a.indexOf(' ');
    const i2 = b.indexOf(' ');
    a = a.slice(i+1).trim();
    b = b.slice(i2+1).trim();
    if(a < b) {
      return -1;
    }
    if(a > b) {
      return 1;
    }
    return 0;
  });
  const output = [];

  // split commit and message and add fixes
  changesList = changesList.map(o => {
    const i = o.indexOf(' ');
    const commit = o.slice(0, i).trim();

    const body = spawnSync('git', ['log', commit, '-n', '1', '--pretty=format:%B']);
    const fixesRegexp = /(Fixes|Closes|Fixed|Closed)\s(\#\d*)/gmi;
    const fixesRegexpForum = /(Fixes|Closes|Fixed|Closed)\s(.*)/gmi;
    const fixesRegexpDiscord = /(Fixes|Closes|Fixed|Closed)\s.*discord.*?(\d+)$/gmi;
    const fixesRegexpIdeas = /(Fixes|Closes|Fixed|Closed)\s.*ideas\.sogebot\.xyz.*?(\d+)/gmi;
    const fixesRegexpBreaking = /BREAKING (CHANGES|CHANGE):\s(.*)/gmis;
    let fixes = [];
    let breakingChange = null;

    if (body.stdout.toString().match(fixesRegexpBreaking)) {
      const text = body.stdout.toString().match(fixesRegexpBreaking)[0];
      breakingChange = text;
    }

    if (body.stdout.toString().match(fixesRegexpIdeas)) {
      const text = body.stdout.toString().match(fixesRegexpIdeas)[0];
      const link = text.split(' ')[1];
      if (link) {
        const number = link.match(/\d*$/)[0];
        fixes = [
          `Fixes [ideas(deprecated)#${number}](${link})`,
        ];
      }
    } else if (body.stdout.toString().match(fixesRegexpDiscord)) {
      const text = body.stdout.toString().match(fixesRegexpDiscord)[0];
      const link = text.split(' ')[1];
      if (link) {
        const number = link.match(/\d*$/)[0];
        fixes = [
          `Fixes [discord#${number}](${link})`,
        ];
      }
    } else if (body.stdout.toString().match(fixesRegexp)) {
      fixes = body.stdout.toString().match(fixesRegexp);
    } else if (body.stdout.toString().match(fixesRegexpForum)) {
      const text = body.stdout.toString().match(fixesRegexpForum)[0];
      const link = text.split(' ')[1];
      if (link) {
        const number = link.match(/\d*$/)[0];
        fixes = [
          `Fixes [community#${number}](${link})`,
        ];
      }
    }

    return {
      commit, message: o.slice(i+1).trim(), fixes, breakingChange,
    };
  });

  // breaking changes from all commits
  if (changesList.filter(o => o.breakingChange).length > 0) {
    // print out bugfixes
    output.push('### BREAKING CHANGES\n');
    for (const change of changesList.filter(o => o.breakingChange)) {
      output.push('* ' + change.breakingChange
        .replace('BREAKING', '')
        .replace('CHANGES:', '')
        .replace('CHANGE:', '')
        .replace(/[\n\r]/g, ' ') // remove newlines
        .replace(/\s{2,}/g, ' ') // remove multiple spaces
      );
    }
    output.push('\n\n');
  }

  // filter to have only fix and feat
  changesList = changesList.filter(o => {
    return o.message.startsWith('fix') || o.message.startsWith('feat');
  });

  if (changesList.filter(o => o.message.startsWith('fix')).length > 0) {
    // print out bugfixes
    output.push('### Bug Fixes\n');
    for (const change of changesList.filter(o => o.message.startsWith('fix'))) {
      output.push(prepareMessage(change));
    }
    output.push('\n');
  }

  if (changesList.filter(o => o.message.startsWith('feat')).length > 0) {
    // print out bugfixes
    output.push('### Features\n');
    for (const change of changesList.filter(o => o.message.startsWith('feat'))) {
      output.push(prepareMessage(change));
    }
    output.push('\n');
  }

  return output;
}

function prepareMessage(change) {
  const regexp = /(fix|feat)\((?<type>\w*)\)\: (?<message>.*)/;
  const match = regexp.exec(change.message);
  try {
    return `* **${match.groups.type}** - ${match.groups.message}${change.fixes.length > 0 ? ', ' + change.fixes.join(', ') : ''} ([${change.commit}](https://github.com/sogehige/sogeBot/commit/${change.commit}))\n`;
  } catch (e) {
    return `* ${change.message.replace('fix:', '').replace('feat:', '').trim()} [${change.commit}](https://github.com/sogehige/sogeBot/commit/${change.commit}))\n`;
  }
}

function sanitizeLine(line) {
  if (argv.escape) {
    const sanitized = line
      .replace(/\%/g, '%25')
      .replace(/\n/g, '%0A')
      .replace(/\r/g, '%0D');
    return sanitized;
  } else {
    return line;
  }
}
