const package = require('../package.json');
const fs = require('fs');
const _ = require('lodash')
const { spawnSync } = require("child_process");

console.log('CHECKING FOR UNUSED DEPENDENCIES, MAY TAKE A WHILE');

console.log('Backup of package.json')
fs.copyFileSync('./package.json', './package.jsonbackup')

const ignored = ['better-sqlite3']
const unused = [];

console.log(' ==== Production dependencies')
for (const [dependency, version] of Object.entries(package.dependencies)) {
  if (dependency.startsWith('@sogebot') || ignored.includes(dependency)) {
    console.log('Ignoring ' + dependency)
  } else {
    process.stdout.write('Checking ' + dependency);
    const packageToCheck = _.cloneDeep(package);

    // removing package
    packageToCheck.dependencies = Object.fromEntries(Object.entries(packageToCheck.dependencies).filter(o => o[0] !== dependency));
    fs.writeFileSync('./package.json', JSON.stringify(packageToCheck, null, 2));

    if (fs.existsSync('./package-lock.json')) {
      fs.unlinkSync('./package-lock.json')
    }

    try {
      spawnSync("make dependencies bot", { shell: true });
      unused.push(dependency)
      process.stdout.write(' !!!! NOT USED or provided by other package \n\n')
    } catch(e) {
      process.stdout.write(' USED\n\n')
    }
  }
}

console.log(' ==== Development dependencies')
for (const [dependency, version] of Object.entries(package.devDependencies)) {
  if (dependency.startsWith('@sogebot') || ignored.includes(dependency)) {
    console.log('Ignoring ' + dependency)
  } else {
    process.stdout.write('Checking ' + dependency);
    const packageToCheck = _.cloneDeep(package);

    // removing package
    packageToCheck.devDependencies = Object.fromEntries(Object.entries(packageToCheck.devDependencies).filter(o => o[0] !== dependency));
    fs.writeFileSync('./package.json', JSON.stringify(packageToCheck, null, 2));

    if (fs.existsSync('./package-lock.json')) {
      fs.unlinkSync('./package-lock.json')
    }

    try {
      spawnSync("make dependencies bot", { shell: true });
      unused.push(dependency)
      process.stdout.write(' !!!! NOT USED \n\n')
    } catch(e) {
      process.stdout.write(' USED\n\n')
    }
  }
}

console.log('Revert of package.json')
fs.copyFileSync('./package.jsonbackup', './package.json')

console.log(JSON.stringify(unused, null, 2))
process.exit(unused.length)