require('dotenv').config();

const fs = require('fs');

const _ = require('lodash');
const { createConnection, getConnectionOptions, getManager } = require('typeorm');
const argv = require('yargs') // eslint-disable-line
  .usage('node tools/backup.js')
  .example('node tools/backup.js list')
  .example('node tools/backup.js save alert ./backup-alert.json')
  .example('node tools/backup.js load alert ./backup-alert.json')
  .command('list', 'list of tables')
  .command('save [table] [path]', 'save backup of [table] to [path]', (yargs) => {
    yargs.demandOption(['table'], 'Please provide table to backup');
    yargs.demandOption(['path'], 'Please provide path to your backup JSON file');
    yargs.positional('table', {
      type:     'string',
      describe: 'table in database, e.g. settings, alert, etc.',
    });
    yargs.positional('path', {
      type:     'string',
      describe: '/path/to/your/backup/file.json',
    });
  })
  .command('load [table] [path]', 'load backup of [table] from [path]', (yargs) => {
    yargs.demandOption(['table'], 'Please provide table to backup');
    yargs.demandOption(['path'], 'Please provide path to your backup JSON file');
    yargs.positional('table', {
      type:     'string',
      describe: 'table in database, e.g. settings, alert, etc.',
    });
    yargs.positional('path', {
      type:     'string',
      describe: '/path/to/your/backup/file.json',
    });
  })
  .demandCommand()
  .help()
  .argv;

const { getMigrationType } = require('../dest/helpers/getMigrationType');

async function main() {
  const type = process.env.TYPEORM_CONNECTION;
  const connectionOptions = await getConnectionOptions();
  let connection;

  if (type === 'mysql' || type === 'mariadb') {
    connection = await createConnection({
      ...connectionOptions,
      synchronize:   false,
      migrationsRun: false,
      charset:       'UTF8MB4_GENERAL_CI',
      entities:      [ './dest/database/entity/*.js' ],
      migrations:    [ `./dest/database/migration/${getMigrationType(connectionOptions.type)}/**/*.js` ],
    });
  } else {
    connection = await createConnection({
      ...connectionOptions,
      synchronize:   false,
      migrationsRun: false,
      entities:      [ './dest/database/entity/*.js' ],
      migrations:    [ `./dest/database/migration/${getMigrationType(connectionOptions.type)}/**/*.js` ],
    });
  }

  if (argv._[0] === 'list') {
    console.log('Available tables:\n');
    const metadatas = await getManager().connection.entityMetadatas;
    const relationTable = [];
    const tables = metadatas
      .map((table) => {
        const relations = table.ownRelations.filter(o => {
          return o.relationType === 'many-to-one';
        }).map(o => o.target);
        for (const rel of relations) {
          if (!relationTable.includes(rel)) {
            relationTable.push(rel);
          }
        }
        return table.tableName;
      });
    // main tables
    console.log(tables
      .filter(table => !relationTable.includes(table))
      .join('\n'));
  }

  if (argv._[0] === 'save') {
    const metadatas = await getManager().connection.entityMetadatas;
    const entity = metadatas.find(o => o.tableName === argv.table);
    const relations = entity.ownRelations.map(o => o.propertyName);
    const backupData = await connection.getRepository(entity.tableName).find({ relations });
    fs.writeFileSync(argv.path, JSON.stringify(backupData, null, 2));
  }

  if (argv._[0] === 'load') {
    const backupData = JSON.parse(fs.readFileSync(argv.path));
    const entity = await getManager().connection.entityMetadatas.find(o => o.tableName === argv.table);
    const relations = entity.ownRelations.map(o => o.type);
    if (type === 'mysql' || type === 'mariadb') {
      await connection.getRepository(entity.tableName).query(`DELETE FROM \`${entity.tableName}\` WHERE 1=1`);
      for (const relation of relations) {
        await connection.getRepository(entity.tableName).query(`DELETE FROM \`${relation}\` WHERE 1=1`);
      }
    } else {
      await connection.getRepository(entity.tableName).query(`DELETE FROM "${entity.tableName}" WHERE 1=1`);
      for (const relation of relations) {
        await connection.getRepository(entity.tableName).query(`DELETE FROM "${relation}" WHERE 1=1`);
      }
    }
    process.stdout.write('Processing');
    for (const ch of _.chunk(backupData, 100)) {
      process.stdout.write('.');
      await connection.getRepository(entity.tableName).save(ch);
    }
    console.log('DONE!');
  }
  process.exit();
}
main();