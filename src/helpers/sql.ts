import { AppDataSource } from '~/database.js';

import { isDbConnected } from '~/helpers/database.js';
import { debug } from '~/helpers/log.js';

// TODO: dynamic way to determinate limit of SQL variables
export let SQLVariableLimit = 999; // sqlite have default limit of 999
if (['mysql', 'mariadb'].includes(process.env.TYPEORM_CONNECTION ?? 'better-sqlite3')) {
  // set default and then check current value
  SQLVariableLimit = 16382; // per https://mariadb.com/kb/en/server-system-variables/#max_prepared_stmt_count
  new Promise(() => {
    const updateSQLVariableLimit = async () => {
      if (!isDbConnected) {
        setTimeout(() => updateSQLVariableLimit(), 10);
        return;
      }
      const query = await AppDataSource.query(`show variables like 'max_prepared_stmt_count'`);
      SQLVariableLimit = Number(query[0].Value);
      debug('sql', `Variable limit for MySQL/MariaDB set dynamically to ${SQLVariableLimit}`);
    };
    updateSQLVariableLimit();
  });
}
if (['postgres'].includes(process.env.TYPEORM_CONNECTION ?? 'better-sqlite3')) {
  SQLVariableLimit = 32767; // per https://stackoverflow.com/a/42251312
}
