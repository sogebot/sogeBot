import { exec, execSync } from 'child_process';

import { HOUR } from '@sogebot/ui-helpers/constants';
import axios from 'axios';
import { clone } from 'lodash';

import Core from './_interface';
import { settings } from './decorators';
import { onStartup } from './decorators/on';
import { error as errorLog, info } from './helpers/log';
import { adminEndpoint } from './helpers/socket';

const versions = {
  '@sogebot/ui-admin':   '',
  '@sogebot/ui-helpers': '',
  '@sogebot/ui-oauth':   '',
  '@sogebot/ui-overlay': '',
  '@sogebot/ui-public':  '',
};

const links = {
  '@sogebot/ui-admin':   'https://raw.githubusercontent.com/sogebot/ui-admin/main/CHANGELOG.md',
  '@sogebot/ui-overlay': 'https://raw.githubusercontent.com/sogebot/ui-overlay/main/CHANGELOG.md',
  '@sogebot/ui-public':  'https://raw.githubusercontent.com/sogebot/ui-public/main/CHANGELOG.md',
};

class Updater extends Core {
  @settings()
  isAutomaticUpdateEnabled = true;

  @settings()
  versions = versions;

  @settings()
  versionsAvailable = clone(versions);

  @settings()
  changelogs = clone(versions);

  @onStartup()
  onStartup() {
    // get current versions
    for (const pkg of Object.keys(this.versions) as Array<keyof typeof versions> ) {
      const actualVersion = execSync(`node -p "require('${pkg}/package.json').version"`).toString().replace('\n', '');
      this.versions[pkg] = actualVersion;
    }

    this.checkUpdate();
    setInterval(() => {
      this.checkUpdate();
    }, HOUR);
  }

  sockets() {
    adminEndpoint(this.nsp, 'updater::trigger', async (opts, cb) => {
      info(`Update for ${opts.pkg}@${opts.version} manually triggered. Update processing.`);
      exec(`npm install ${opts.pkg}@${opts.version}`, (error, _, stderr) => {
        if (!error) {
          this.versions[opts.pkg as keyof typeof versions] = opts.version;
          info(`${opts.pkg}@${opts.version} updated succesfully!`);
          if (cb) {
            cb(null, '');
          }
        } else {
          errorLog(stderr);
          if (cb) {
            cb(stderr, '');
          }
        }
      });
    });
  }

  async getChangelog(pkg: keyof typeof versions) {
    if (Object.keys(links).includes(pkg)) {
      this.changelogs[pkg] = (await axios.get<string>(links[pkg as keyof typeof links])).data;
    }
  }

  checkUpdate() {
    for (const pkg of Object.keys(this.versions) as Array<keyof typeof versions>) {
      this.getChangelog(pkg);
    }

    for (const pkg of Object.keys(this.versions) as Array<keyof typeof versions> ) {
      const versionsList = JSON.parse(execSync(`npm view ${pkg} versions --json`).toString());
      const [actualMajor, actualMinor, actualPatch] = execSync(`node -p "require('${pkg}/package.json').version"`).toString().replace('\n', '').split('.');
      execSync(`node -p "delete require.cache[require.resolve('${pkg}/package.json')]"`);

      let applicableVersion = [actualMajor, actualMinor, actualPatch].join('.');
      // we are assuming that except first number, we can update
      // get latest applicable update
      for (const version of versionsList) {
        const [possibleMajor, possibleMinor, possiblePatch] = version.split('.');
        if (possibleMajor === actualMajor) {
          if (possibleMinor >= actualMinor || (possibleMinor === actualMinor && possiblePatch >= actualPatch)) {
            applicableVersion = [possibleMajor, possibleMinor, possiblePatch].join('.');
          }
        } else {
          continue;
        }
      }

      if ([actualMajor, actualMinor, actualPatch].join('.') !== applicableVersion
          && [actualMajor, actualMinor, actualPatch].join('.') !== this.versionsAvailable[pkg]) {
        if (this.isAutomaticUpdateEnabled
          && ((process.env.NODE_ENV || 'development') === 'production' && !(global as any).mocha)) {
          info(`New version of ${pkg}@${applicableVersion} package found. Automatic update processing.`);
          exec(`npm install ${pkg}@${applicableVersion}`, (error, _, stderr) => {
            if (!error) {
              info(`${pkg}@${applicableVersion} updated succesfully!`);
            } else {
              errorLog(stderr);
            }
          });
        } else {
          info(`New version of ${pkg}@${applicableVersion} package found. Automatic update disabled.`);
        }
      }
      this.versionsAvailable[pkg] = applicableVersion;
    }
  }
}
const update = new Updater();
export default update;