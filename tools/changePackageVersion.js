import fs from 'fs'

import package from '../package.json'

fs.writeFileSync('./package.json', JSON.stringify({ ...package, version: process.argv[2] }, null, 2));