import fs from 'fs'

import pkg from '../package.json' assert { type: "json" };

fs.writeFileSync('./package.json', JSON.stringify({ ...pkg, version: process.argv[2] }, null, 2));