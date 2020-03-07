global.mocha = true;
require('../dest/main.js');

module.exports = {
  db: require('./helpers/db'),
  message: require('./helpers/messages'),
  user: require('./helpers/user'),
  tmi: require('./helpers/tmi'),
  variable: require('./helpers/variable'),
  time: require('./helpers/time'),
};
