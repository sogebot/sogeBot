var argv = require('yargs')
  .usage('Usage: $0 --uri <connectionUri>')
  .alias('uri', 'connectionUri')
  .nargs('uri', 1)
  .describe('uri', 'connectionUri of your mongodb instance')
  .demandOption(['uri'])
  .help('h')
  .alias('h', 'help')
  .argv

const fs = require('fs')

const Datastore = require('nedb')

const client = require('mongodb').MongoClient
const mongodbUri = require('mongodb-uri')

if (!fs.existsSync('./db') || (!fs.existsSync('./db/nedb'))) console.error('No NeDB directory was found')

var completeProcesses = []
var processExpectedCount = 0
var allStarted = false

async function main () {
  let mongo = await client.connect(argv.uri, { poolSize: 5, useNewUrlParser: true })
  let db = await mongo.db(mongodbUri.parse(argv.uri).database)
  for (let file of fs.readdirSync('db/nedb/')) {
    processExpectedCount++
    let collection = file.replace('.db', '')
    let connection = new Datastore({ filename: './db/nedb/' + collection + '.db', autoload: true })
    connection.find({}, async (e, items) => {
      console.log(`Processing ${collection}`)
      for (let item of items) {
        delete item._id
        await db.collection(collection).insert(item)
      }
      completeProcesses.push(collection)
    })
  }
  allStarted = true
}

function waitForComplete () {
  if (processExpectedCount === completeProcesses.length && processExpectedCount > 0 && allStarted) {
    console.log('Migration complete')
    process.exit()
  } else {
    setTimeout(() => waitForComplete(), 1000)
  }
}

main()
waitForComplete()
