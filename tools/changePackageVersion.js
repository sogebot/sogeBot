const fs = require('fs');

const package = require('../package.json');

fs.writeFileSync('./package.json', JSON.stringify({ ...package, version: process.argv[2] }, null, 2));