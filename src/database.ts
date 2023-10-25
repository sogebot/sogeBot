import { DataSource, DataSourceOptions  } from 'typeorm';

import { warning } from './helpers/log.js';

import { TypeORMLogger } from '~/helpers/logTypeorm.js';

if (process.env.FORCE_DB_SYNC === 'IKnowWhatIamDoing') {
  setTimeout(() => {
    warning('FORCE_DB_SYNC is enabled! Are you sure this should be enabled?');
  }, 5000);
}

const MySQLDataSourceOptions = {
  type:           'mysql',
  connectTimeout: 60000,
  acquireTimeout: 120000,
  host:           process.env.TYPEORM_HOST,
  port:           Number(process.env.TYPEORM_PORT ?? 3306),
  username:       process.env.TYPEORM_USERNAME,
  password:       process.env.TYPEORM_PASSWORD,
  database:       process.env.TYPEORM_DATABASE,
  logging:        ['error'],
  logger:         new TypeORMLogger(),
  synchronize:    process.env.FORCE_DB_SYNC === 'IKnowWhatIamDoing',
  migrationsRun:  true,
  entities:       [ 'dest/database/entity/*.js' ],
  subscribers:    [ 'dest/database/entity/*.js' ],
  migrations:     [ `dest/database/migration/mysql/**/*.js` ],
} satisfies DataSourceOptions;

const PGDataSourceOptions = {
  type:          'postgres',
  host:          process.env.TYPEORM_HOST,
  port:          Number(process.env.TYPEORM_PORT ?? 3306),
  username:      process.env.TYPEORM_USERNAME,
  password:      process.env.TYPEORM_PASSWORD,
  database:      process.env.TYPEORM_DATABASE,
  logging:       ['error'],
  logger:        new TypeORMLogger(),
  synchronize:   process.env.FORCE_DB_SYNC === 'IKnowWhatIamDoing',
  migrationsRun: true,
  entities:      [ 'dest/database/entity/*.js' ],
  subscribers:   [ 'dest/database/entity/*.js' ],
  migrations:    [ `dest/database/migration/postgres/**/*.js` ],
} satisfies DataSourceOptions;

const SQLiteDataSourceOptions = {
  type:          'better-sqlite3',
  database:      process.env.TYPEORM_DATABASE ?? 'sogebot.db',
  logging:       ['error'],
  logger:        new TypeORMLogger(),
  synchronize:   process.env.FORCE_DB_SYNC === 'IKnowWhatIamDoing',
  migrationsRun: true,
  entities:      [ 'dest/database/entity/*.js' ],
  subscribers:   [ 'dest/database/entity/*.js' ],
  migrations:    [ `dest/database/migration/sqlite/**/*.js` ],
} satisfies DataSourceOptions;

let AppDataSource: DataSource;
if (process.env.TYPEORM_CONNECTION === 'mysql' || process.env.TYPEORM_CONNECTION === 'mariadb') {
  AppDataSource = new DataSource(MySQLDataSourceOptions);
} else if (process.env.TYPEORM_CONNECTION === 'postgres') {
  AppDataSource = new DataSource(PGDataSourceOptions);
} else {
  AppDataSource = new DataSource(SQLiteDataSourceOptions);
}

if (typeof (global as any).it === 'function') {
  console.log(AppDataSource.options);
}

export { AppDataSource };