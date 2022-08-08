import { exec, execSync } from 'child_process';

import { MINUTE } from '@sogebot/ui-helpers/constants';
import { clone } from 'lodash';

import Core from '~/_interface';
import { settings } from '~/decorators';
import { onStartup } from '~/decorators/on';
import { error as errorLog, info } from '~/helpers/log';
import { adminEndpoint } from '~/helpers/socket';

const versions = {
  '@sogebot/ui-admin':   '',
  '@sogebot/ui-helpers': '',
  '@sogebot/ui-oauth':   '',
  '@sogebot/ui-overlay': '',
  '@sogebot/ui-public':  '',
};

const updating = new Set();

class Updater extends Core {
  @settings()
    isAutomaticUpdateEnabled = true;

  @settings()
    versions = versions;

  @settings()
    versionsAvailable = clone(versions);

  @onStartup()
  onStartup() {
    if ((process.env.NODE_ENV || 'development') === 'development') {
      return;
    }
    setTimeout(async () => {
      // get current versions
      for (const pkg of Object.keys(this.versions) as Array<keyof typeof versions> ) {
        const json = await import(`${pkg}/package.json`);
        const actualVersion = json.default.version;
        this.versions[pkg] = actualVersion;
      }

      this.checkUpdate();
      setInterval(() => {
        this.checkUpdate();
      }, MINUTE);
    }, MINUTE / 10);
  }

  sockets() {
    adminEndpoint('/core/updater', 'updater::check', async (cb) => {
      info(`Manually triggered check for updater.`);
      await this.checkUpdate();
      cb(null);
    });
    adminEndpoint('/core/updater', 'updater::trigger', async (opts, cb) => {
      if (updating.has(opts.pkg)) {
        info(`Update for ${opts.pkg} in progress. Please wait until completed.`);
        if (cb) {
          cb(`Update for ${opts.pkg} in progress. Please wait until completed.`);
        }
      }
      updating.add(opts.pkg);
      info(`Update for ${opts.pkg}@${opts.version} manually triggered. Update processing.`);
      exec(`npm install -s ${opts.pkg}@${opts.version}`, (error, _, stderr) => {
        if (!error) {
          this.versions[opts.pkg as keyof typeof versions] = opts.version;
          info(`${opts.pkg}@${opts.version} updated succesfully!`);
          if (cb) {
            cb(null);
          }
        } else {
          errorLog(stderr);
          if (cb) {
            cb(stderr);
          }
        }
        updating.delete(opts.pkg);
      });
    });
  }

  async checkUpdate() {
    for (const pkg of Object.keys(this.versions) as Array<keyof typeof versions> ) {
      try {
        const versionsList = JSON.parse(execSync(`npm view ${pkg} versions --json`).toString());

        delete require.cache[require.resolve(`${pkg}/package.json`)];
        const [actualMajor, actualMinor, actualPatch] = (await import(`${pkg}/package.json`)).default.version.split('.');

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
            && (!(global as any).mocha)) {
            if (updating.has(pkg)) {
              continue; // skip if update in progress
            }
            updating.add(pkg);

            info(`New version of ${pkg}@${applicableVersion} package found. Automatic update processing.`);
            await new Promise((resolve) => {
              exec(`npm install -s ${pkg}@${applicableVersion}`, (error, _, stderr) => {
                if (!error) {
                  this.versions[pkg as keyof typeof versions] = applicableVersion;
                  info(`${pkg}@${applicableVersion} updated succesfully!`);
                } else {
                  errorLog(stderr);
                }
                updating.delete(pkg);
                resolve(true);
              });
            });
          } else {
            info(`New version of ${pkg}@${applicableVersion} package found. Automatic update disabled.`);
          }
        }
        this.versionsAvailable[pkg] = applicableVersion;
      } catch (e) {
        if (!updating.has(pkg)) {
          errorLog(e);
        }
      }
    }
  }
}
const update = new Updater();
export default update;