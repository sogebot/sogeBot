'use strict'
require('module-alias/register')
global.migration = true

const fs = require('fs')

const availableDbs = ['nedb', 'mongodb']

var argv = require('yargs')
  .usage('Usage: $0 --from <database> --to <database> --mongoUri <connectionUri>')
  .nargs('mongoUri', 1)
  .describe('from', 'database from migrate')
  .describe('to', 'database to migrate')
  .describe('mongoUri', 'connectionUri of your mongodb instance')
  .demandOption(['from', 'to'])
  .help('h')
  .alias('h', 'help')
  .alias('f', 'from')
  .alias('t', 'to')
  .epilog('  <database> can be ' + availableDbs.join(', ') + '\n\n!!! WARNING: All data on --to <database> will be erased !!!')
  .argv

const relationships = {
  'custom.variables': [
    'custom.variables.watch|variableId',
    'custom.variables.history|cvarId'
  ],
  'dashboards': [
    'widgets|dashboardId'
  ],
  'systems.customcommands': [
    'systems.customcommands.responses|cid'
  ],
  'systems.polls': [
    'systems.polls.votes|vid'
  ],
  'systems.timers': [
    'systems.timers.responses|timerId',
  ]
}

const mappings = {}

if (argv.from.toLowerCase() === argv.to.toLowerCase()) {
  return console.error('Error: Cannot migrate between same dbs')
}
if (!availableDbs.includes(argv.from)) {
  return console.error('Error: From database ' + argv.from + ' is not supported - available options: ' + availableDbs.join(', '))
}
if (!availableDbs.includes(argv.to)) {
  return console.error('Error: From database ' + argv.from + ' is not supported - available options: ' + availableDbs.join(', '))
}
if ((argv.from === 'nedb') && (!fs.existsSync('./db') || (!fs.existsSync('./db/nedb')))) return console.error('Error: no NeDB directory was found')
if ((argv.from === 'mongodb' || argv.to === 'mongodb') && !argv.mongoUri) return console.error('Error: --mongoUri needs to be defined for MongoDB')

// NeDB prerequisites
if (argv.to === 'nedb') {
  // purge directory
  const path = './db/nedb'
  if (fs.existsSync(path)) {
    for (let file of fs.readdirSync(path)) {
      fs.unlinkSync(path + '/' + file);
    }
  }
}

const dbName = {
  from: function() {
    if (argv.from === 'mongodb') return argv.mongoUri
    else return null
  },
  to: function() {
    if (argv.to === 'mongodb') return argv.mongoUri
    else return null
  }
}

const from = new (require('../dest/databases/database'))(false, false, argv.from, dbName.from())
const to = new (require('../dest/databases/database'))(false, false, argv.to, dbName.to())

async function main() {
  if (!from.engine.connected || !to.engine.connected) return setTimeout(() => main(), 10)

  console.log('Info: Databases connections established')
  const key = '_id'
  const collections = await from.engine.collections()

  // # go through main relationship -> create new ids
  for (let table of Object.keys(relationships)) {

    await to.engine.remove(table, {})
    console.log('Process: ' + table)
    // remove tables from collections
    const idx = collections.indexOf(table)
    if (idx > -1) { collections.splice(idx, 1) }
    else console.log(table + ' not found')

    const items = await from.engine.find(table, {})
    for (let item of items) {
      const _id = String(item[key]); delete item[key]
      const newItem = await to.engine.insert(table, item)

      if (typeof mappings[table] === 'undefined') mappings[table] = []
      mappings[table].push({
        oldId: _id,
        newId: String(newItem._id)
      })

    }
  }

  // # go through rest 1:1 collections
  for (let table of collections) {
    await to.engine.remove(table, {})
    console.log('Process: ' + table)
    const items = await from.engine.find(table, {})
    for (let item of items) {
      delete item._id
      await to.engine.insert(table, item)
    }
  }

  // # update second part of relationship with new ids
  for (let k of Object.keys(relationships)) {
    for (let [table, key] of relationships[k].map((o) => o.split('|'))) {
      console.log('RemappingTable: ' + table)
      const items = await to.engine.find(table, {})
      for (let item of items) {
        const _id = String(item[key]); delete item._id
        let oldId = item[key]
        if (typeof item[key] === 'undefined') continue

        if (typeof mappings[k] !== 'undefined') {
          const mapping = mappings[k].find(o => o.oldId === oldId)
          if (typeof oldId === 'object') {
            console.log('     IncorrectKeyFormat[' + key + ']: ' + typeof oldId)
            await to.engine.remove(table, { _id: String(item._id) }, item)
          } else if (mapping) {
            console.log('     Remapping: ' + oldId + ' => ' + mapping.newId)
            item[key] = mapping.newId
            await to.engine.update(table, { [key]: _id }, item)
          } else {
            console.log('     NotFound[' + key + ']: ' + oldId)
            await to.engine.remove(table, { [key]: _id }, item)
          }
        }
      }
    }
  }

  console.log('Info: Completed')
  process.exit()
};

console.log('Info: Connecting to dbs')
main();
