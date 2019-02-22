const chalk = require('chalk');
const fs = require('fs')
const path = require('path');
const glob = require('glob')
const { spawnSync } = require('child_process');


const argv = require('yargs') // eslint-disable-line
  .usage('Usage: node tool/$0 -v [version]')
  .version('false')
  .describe('v', 'version to release')
  .demandOption(['v'])
  .describe('nopush', 'disable push')
  .boolean('nopush')
  .describe('build', 'build a zip')
  .boolean('build')
  .help('help')
  .alias('h', 'help')
  .argv
const currentBranch = getCurrentBranch();
const releaseVersion = argv.v
const isMajorRelease = releaseVersion.endsWith('.0');
const shouldPushToGit = argv.nopush
const shouldBuildZip = argv.build

doRelease();

function getCurrentBranch() {
  const branches = spawnSync('git', ['branch']);
  const branch = branches.stdout.toString().split('\n').filter((o) => {
    return o.trim().startsWith('*');
  })[0].slice(2);
  return branch;
}

function getLastMajorVersion() {
  // bump down major version
  const [x, y, z] = releaseVersion.split('.');
  return `${x}.${Number(y) - 1}.x`;
}

function getCurrentMajorVersion() {
  const [x, y, z] = releaseVersion.split('.');
  return `${x}.${y}.x`;
}

function doRelease() {
  console.log(chalk.inverse('RELEASE TOOL'));
  console.log('\t' + chalk.yellow('Release type:    ') + (isMajorRelease ? 'major' : 'minor'));
  console.log('\t' + chalk.yellow('Release version: ') + releaseVersion);
  console.log('\t' + chalk.yellow('Current branch:  ') + currentBranch);

  console.log('\n' + chalk.inverse('CREATE RELEASE BRANCH') + ' release-' + releaseVersion);
  spawnSync('git', ['branch', '-D', 'release-' + releaseVersion]);
  spawnSync('git', ['checkout', '-b', 'release-' + releaseVersion]);

  if (isMajorRelease) {
    const archiveDir = path.join(__dirname, '..', 'docs', '_archive', getLastMajorVersion())

    console.log('\n' + chalk.inverse('DOCS RELEASE'));
    console.log(chalk.yellow('1.') + ' Creating ' + archiveDir);
    if (fs.existsSync(archiveDir)) {
      spawnSync('rm', ['-r', archiveDir]);
    }
    fs.mkdirSync(archiveDir)

    console.log(chalk.yellow('2.') + ' Backup of current docs');
    const archiveDocsFiles = glob.sync('docs/*', {
      ignore: [
        'docs/_archive', 'docs/_master', 'docs/_navbar.md'
      ]
    });
    for (const f of archiveDocsFiles) {
      spawnSync('cp', ['-r', f, archiveDir]);
    }

    const sidebar = path.join(archiveDir, '_sidebar.md');
    console.log(chalk.yellow('3.') + ' Update ' + sidebar + ' paths');
    let sidebarFile = fs.readFileSync(sidebar).toString();
    sidebarFile = sidebarFile.replace(/(\*\s\[.*\]\(\/)(.*\))/g, '$1_archive/' + getLastMajorVersion() + '/$2');
    fs.writeFileSync(sidebar, sidebarFile)

    console.log(chalk.yellow('4.') + ' Replace current docs with _master');
    const masterDocsFiles = glob.sync('./docs/_master/*');
    for (const f of masterDocsFiles) {
      spawnSync('cp', ['-r', f, 'docs']);
    }

    console.log(chalk.yellow('5.') + ' Update ' + path.join('docs', '_sidebar.md') + ' paths');
    sidebarFile = fs.readFileSync(path.join('docs', '_sidebar.md')).toString();
    sidebarFile = sidebarFile.replace(/_master/g, '');
    fs.writeFileSync(path.join('docs', '_sidebar.md'), sidebarFile)

    const navbar = path.join('docs', '_navbar.md');
    console.log(chalk.yellow('6.') + ' Add archive link to ' + navbar);
    let navbarFile = fs.readFileSync(navbar).toString().split('\n');
    let newNavbarFile = []
    for (let line of navbarFile) {
      newNavbarFile.push(line)
      if (line.toLowerCase().includes('archive') && !line.toLowerCase().includes('_archive/')) {
        newNavbarFile.push(`  * [${getLastMajorVersion()}](/_archive/${getLastMajorVersion()}/)`)
      }
    }
    fs.writeFileSync(navbar, newNavbarFile.join('\n'))

    console.log(chalk.yellow('7.') + ' Update current version ' + navbar);
    navbarFile = fs.readFileSync(navbar).toString().split('\n');
    newNavbarFile = []
    for (let line of navbarFile) {
      if (line.toLowerCase().includes('current')) {
        newNavbarFile.push(`* **Current:** [${getCurrentMajorVersion()}](/)`)
      } else {
        newNavbarFile.push(line)
      }
    }
    fs.writeFileSync(navbar, newNavbarFile.join('\n'))

    console.log(chalk.yellow('8.') + ' Create doc commit');
    spawnSync('git', ['add', '-A']);
    spawnSync('git', ['commit', '-m', 'docs: release docs ' + releaseVersion + '']);
  }

  console.log('\n' + chalk.inverse('PACKAGE RELEASE'));
  console.log(chalk.yellow('1.') + ' Updating package.json version to ' + releaseVersion);
  let packageFile = fs.readFileSync('package.json').toString();
  packageFile = packageFile.replace(/("version": ").*(",)/g, '$1' + releaseVersion + '$2');
  fs.writeFileSync('package.json', packageFile)

  console.log(chalk.yellow('2.') + ' Create release commit');
  spawnSync('git', ['add', '-A']);
  spawnSync('git', ['commit', '-m', 'build: ' + releaseVersion + '']);

  if (!shouldPushToGit) {
    console.log('\n' + chalk.inverse('PUSHING COMMITS'));
    spawnSync('git', ['push', '-fu', 'origin', 'release-' + releaseVersion]);
  } else {
    console.log('\n' + chalk.inverse('PUSHING COMMITS - SKIPPED'));
  }

  if (shouldBuildZip && shouldPushToGit) {
    console.log('\n' + chalk.inverse('ZIP BUILD'));

    console.log(chalk.yellow('1.') + ' Download release package');
    spawnSync('wget', ['https://github.com/sogehige/sogeBot/archive/release-' + releaseVersion + '.zip']);

    console.log(chalk.yellow('2.') + ' Unzip downloaded package');
    spawnSync('unzip', ['release-' + releaseVersion + '.zip', '-d', 'release-' + releaseVersion]);

    console.log(chalk.yellow('3.') + ' Running make');
    spawnSync('cd', ['release-' + releaseVersion]);
    spawnSync('make');

    console.log(chalk.yellow('4.') + ' Creating release package');
    spawnSync('make', ['pack']);

    console.log(chalk.yellow('5.') + ' Copy release package to /');
    spawnSync('cp', ['*.zip', '../']);
  } else {
    console.log('\n' + chalk.inverse('ZIP BUILD - SKIPPED'));
  }

  console.log('\n' + chalk.inverse('Back to ' + currentBranch + ' branch'));
  spawnSync('git', ['checkout', currentBranch]);
}