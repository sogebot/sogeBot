/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const logDir = './logs';

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
};