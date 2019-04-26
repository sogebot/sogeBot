const chalk = require('chalk');
const fs = require('fs')
const path = require('path');
const glob = require('glob')
const { spawnSync } = require('child_process');


const argv = require('yargs') // eslint-disable-line
  .usage('node tools/release.js <cmd> [args]')
  .command('build [branch]', 'make a zip file from branch', (yargs) => {
    yargs.demandOption(['branch'], 'Please provide branch argument to work with this tool')
    yargs.positional('branch', {
      type: 'string',
      describe: 'github origin branch'
    })
  })
  .command('docs', 'move master docs to main docs', (yargs) => {
  })
  .demandCommand()
  .help()
  .argv

if (argv._[0] === 'build') {
  buildZipFile()
} else if (argv._[0] === 'docs') {
  buildDocs()
}

function buildZipFile() {
  console.log(chalk.inverse('Creating a zip file from ' + argv.branch + ' branch'));

  console.log(chalk.yellow('1.') + ' Download branch zip file');
  spawnSync('curl', ['https://codeload.github.com/sogehige/sogeBot/zip/' + argv.branch, '--output', argv.branch + '.zip']);

  console.log(chalk.yellow('2.') + ' Unzip downloaded zip file');
  spawnSync('unzip', [argv.branch + '.zip']);


  console.log(chalk.yellow('3.') + ' Running make');
  spawnSync('cd', [argv.branch]);
  spawnSync('make', {
    cwd: 'sogeBot-' + argv.branch
  });

  console.log(chalk.yellow('4.') + ' Creating release package');
  spawnSync('make', ['pack'], {
    cwd: 'sogeBot-' + argv.branch
  });

  console.log(chalk.yellow('5.') + ' Copy release package to /');
  spawnSync('cp', ['sogeBot-' + argv.branch + '/*.zip', '.']);

  console.log(chalk.yellow('6.') + ' Cleanup directory');
  spawnSync('rm', ['-rf', 'sogeBot-' + argv.branch]);
  spawnSync('rm', ['-rf', argv.branch + '.zip']);
}

function buildDocs() {
  const archiveDir = path.join(__dirname, '..', 'docs', '_archive', getLastMajorVersion())
  const currentBranch = getCurrentBranch()

  console.log(chalk.inverse('Create docs branch'));
  spawnSync('git', ['branch', '-D', 'docs-release']);
  spawnSync('git', ['checkout', '-b', 'docs-release']);

  console.log('\n' + chalk.inverse('Releasing docs'));
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
  spawnSync('git', ['commit', '-m', 'docs: release docs ' + getReleaseVersion() + '']);

  console.log('\n' + chalk.inverse('PUSHING COMMITS'));
  spawnSync('git', ['push', '-fu', 'origin', 'docs-release']);

  console.log('\n' + chalk.inverse('Back to ' + currentBranch + ' branch'));
  spawnSync('git', ['checkout', currentBranch]);
}

function getLastMajorVersion() {
  // bump down major version
  const [x, y, z] = getReleaseVersion().split('.');
  return `${x}.${Number(y) - 1}.x`;
}

function getNextMajorVersion() {
  // bump down major version
  const [x, y, z] = getReleaseVersion().split('.');
  return `${x}.${Number(y) + 1}.x`;
}

function getCurrentMajorVersion() {
  const [x, y, z] = getReleaseVersion().split('.');
  return `${x}.${y}.x`;
}

function getCurrentBranch() {
  const branches = spawnSync('git', ['branch']);
  const branch = branches.stdout.toString().split('\n').filter((o) => {
    return o.trim().startsWith('*');
  })[0].slice(2);
  return branch;
}

function getReleaseVersion() {
  const regex = /"version": "(.*-SNAPSHOT)",/g
  let packageFile = fs.readFileSync('package.json').toString();
  version = regex.exec(packageFile)[1];
  return version.replace('-SNAPSHOT', '')
}