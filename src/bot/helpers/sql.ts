import { isDbConnected } from './database';
import { getManager } from 'typeorm';
import { debug } from './log';

// TODO: dynamic way to determinate limit of SQL variables
export let SQLVariableLimit = 999; // sqlite have default limit of 999
if (['mysql', 'mariadb'].includes(process.env.TYPEORM_CONNECTION ?? 'sqlite')) {
  // set default and then check current value
  SQLVariableLimit = 16382; // per https://mariadb.com/kb/en/server-system-variables/#max_prepared_stmt_count
  new Promise(async () => {
    const updateSQLVariableLimit = async () => {
      if (!isDbConnected) {
        return setTimeout(() => updateSQLVariableLimit(), 1000);
      }
      const query = await getManager().query(`show variables like 'max_prepared_stmt_count'`);
      SQLVariableLimit = Number(query[0].Value);
      debug('sql', `Variable limit for MySQL/MariaDB set dynamically to ${SQLVariableLimit}`);
    };
    updateSQLVariableLimit();
  });
};
if (['postgres'].includes(process.env.TYPEORM_CONNECTION ?? 'sqlite')) {
  SQLVariableLimit = 32767; // per https://stackoverflow.com/a/42251312
};
