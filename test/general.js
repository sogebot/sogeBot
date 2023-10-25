global.mocha = true;
import('./mocks.js');
import('../dest/main.js');
import('./mocks.js');
import { VariableWatcher } from '../dest/watchers.js';

beforeEach(async () => {
  await VariableWatcher.check();
});

let url = 'http://sogebot.github.io/sogeBot/#';
if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
  url = 'http://sogebot.github.io/sogeBot/#/_master';
}

import * as db from './helpers/db.js';
import * as message from './helpers/messages.js';
import * as user from './helpers/user.js';
import * as tmi from './helpers/tmi.js';
import * as variable from './helpers/variable.js';
import * as time from './helpers/time.js';


export { db, message, user, time, variable, tmi, url };