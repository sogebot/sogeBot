import {spawnSync} from 'child_process';

import gitSemverTags from 'git-semver-tags';
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

yargs(hideBin(process.argv))
  .command('cli <commit>', 'create changelog between commits/tags', (yargs) => {
    return yargs
      .positional('commit', {
        describe: 'commit(preferred) or tag interval e.g. 9.0.3 or 9.0.2..9.0.3',
        type: 'string',
      })
    }, (argv) => {
      const changesSpawn = spawnSync('git', ['log', argv.commit, '--oneline']);
      for (const output of changes(changesSpawn.stdout.toString().split('\n'))) {
        process.stdout.write(output);
      }
  })
  .command('nextTagMajor', 'get next major tag', () => {}, (argv) => {
    gitSemverTags().then((tags) => {
      const latestTag = tags[0];

      const changesList = [];
      const changesSpawn = spawnSync('git', ['log', `${latestTag}...HEAD`, '--oneline']);
      changesList.push(...changes(changesSpawn.stdout.toString().split('\n')));

      const [ latestMajorVersion, latestMinorVersion, latestPatchVersion ] = tags[0].split('.');
      process.stdout.write(`${Number(latestMajorVersion)+1}.0.0`);
    });
  })
  .command('nextTag', 'get next tag', () => {}, (argv) => {
      gitSemverTags().then((tags) => {
        const latestTag = tags[0];

        const changesList = [];
        const changesSpawn = spawnSync('git', ['log', `${latestTag}...HEAD`, '--oneline']);
        changesList.push(...changes(changesSpawn.stdout.toString().split('\n')));

        const [ latestMajorVersion, latestMinorVersion, latestPatchVersion ] = tags[0].split('.');

        if (changesList.includes('### BREAKING CHANGES\n')) {
          process.stdout.write(`${Number(latestMajorVersion)+1}.0.0`);
        } else if (changesList.join().includes('-feat-blue')) {
          // new tag
          process.stdout.write(`${latestMajorVersion}.${Number(latestMinorVersion)+1}.0`);
        } else {
          process.stdout.write(`${latestMajorVersion}.${latestMinorVersion}.${Number(latestPatchVersion)+1}`);
        }
        });
  })
  .command('nextSnapshot', 'get next tag', () => {}, (argv) => {
    gitSemverTags().then((tags) => {
      const [ latestMajorVersion, latestMinorVersion ] = tags[0].split('.');
      process.stdout.write(`${latestMajorVersion}.${Number(latestMinorVersion)+1}.0-SNAPSHOT`);
    });
  })
  .command('generate', 'generate changelog', () => {}, (argv) => {
    gitSemverTags().then((tags) => {
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
          process.stdout.write(line);
        }
      }
    })
  })
  .demandCommand()
  .parse()

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
    return !o.message.startsWith('build');
  });

  for (const change of changesList) {
    output.push(prepareMessage(change));
  }

  return output;
}

function isFix (msg) {
  return msg.startsWith('fix');
}

function prepareMessage(change) {
  if (change.commit.length === 0) {
    return ''
  }
  const regexp = /(.*?):\((?<type>\w*)\)\: (?<message>.*)/;
  const match = regexp.exec(change.message);
  try {
    return `- ${change.commit} ${change.message}${change.fixes.length > 0 ? ', ' + change.fixes.join(', ') : ''}\n`;
  } catch (e) {
    return `- ${change.commit} ${change.message}\n`;
  }
}