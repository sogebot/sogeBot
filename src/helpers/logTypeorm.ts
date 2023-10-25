import { Logger, QueryRunner } from 'typeorm';

import { error as errorLog } from '~/helpers/log.js';

export class TypeORMLogger implements Logger {
  /**
     * Logs query and parameters used in it.
     */
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    return;
  }
  /**
     * Logs query that is failed.
     */
  logQueryError(error: string | Error, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    const sql = query + (parameters && parameters.length ? ' -- PARAMETERS: ' + JSON.stringify(parameters) : '');
    errorLog('QUERY ERROR !!! \n' + sql + ' \n\t --- ' + (typeof error === 'string' ? error : error.message));
  }
  /**
     * Logs query that is slow.
     */
  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    return;
  }
  /**
     * Logs events from the schema build process.
     */
  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    return;
  }
  /**
     * Logs events from the migrations run process.
     */
  logMigration(message: string, queryRunner?: QueryRunner) {
    return;
  }
  /**
     * Perform logging using given logger, or by default to the console.
     * Log has its own level and message.
     */
  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner) {
    return;
  }
}