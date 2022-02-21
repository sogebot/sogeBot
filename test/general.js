global.mocha = true;
require('./mocks');
require('../dest/main.js');
const { VariableWatcher } = require('../dest/watchers');

beforeEach(async () => {
  await VariableWatcher.check();
});

let url = 'http://sogebot.github.io/sogeBot/#';
if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
  url = 'http://sogebot.github.io/sogeBot/#/_master';
}

module.exports = {
  url,
  db:       require('./helpers/db'),
  message:  require('./helpers/messages'),
  user:     require('./helpers/user'),
  tmi:      require('./helpers/tmi'),
  variable: require('./helpers/variable'),
  time:     require('./helpers/time'),
};
