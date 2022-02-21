// https://github.com/typeorm/typeorm/issues/307
// https://gist.github.com/aigoncharov/556f8c61d752eff730841170cd2bc3f1
// 

import { Mutex, MutexInterface } from 'async-mutex';
import { EntityManager, QueryRunner } from 'typeorm';
import { BetterSqlite3Driver } from 'typeorm/driver/better-sqlite3/BetterSqlite3Driver';
import { BetterSqlite3QueryRunner } from 'typeorm/driver/better-sqlite3/BetterSqlite3QueryRunner';
import { QueryRunnerProviderAlreadyReleasedError } from 'typeorm/error/QueryRunnerProviderAlreadyReleasedError';
// A singleton mutex for all sqlite transactions.
const mutex = new Mutex();

class BetterSqlite3QueryRunnerPatched extends BetterSqlite3QueryRunner {
  private _releaseMutex: MutexInterface.Releaser | null;

  public async startTransaction(level?: any): Promise<void> {
    this._releaseMutex = await mutex.acquire();
    return super.startTransaction(level);
  }

  public async commitTransaction(): Promise<void> {
    if (!this._releaseMutex) {
      throw new Error('BetterSqlite3QueryRunnerPatched.commitTransaction -> mutex releaser unknown');
    }
    await super.commitTransaction();
    this._releaseMutex();
    this._releaseMutex = null;
  }

  public async rollbackTransaction(): Promise<void> {
    if (!this._releaseMutex) {
      throw new Error('BetterSqlite3QueryRunnerPatched.rollbackTransaction -> mutex releaser unknown');
    }
    await super.rollbackTransaction();
    this._releaseMutex();
    this._releaseMutex = null;
  }

  public async connect(): Promise<any> {
    if (!this.isTransactionActive) {
      const release = await mutex.acquire();
      release();
    }
    return super.connect();
  }
}

class BetterSqlite3DriverPatched extends BetterSqlite3Driver {
  public createQueryRunner(): QueryRunner {
    if (!this.queryRunner) {
      this.queryRunner = new BetterSqlite3QueryRunnerPatched(this);
    }
    return this.queryRunner;
  }
}

// Patch the underlying BetterSqlite3Driver, since it's impossible to convince typeorm to use only our
// patched classes. (Previously we patched DriverFactory and Connection, but those would still
// create an unpatched BetterSqlite3Driver and then overwrite it.)
BetterSqlite3Driver.prototype.createQueryRunner = BetterSqlite3DriverPatched.prototype.createQueryRunner;
(BetterSqlite3Driver.prototype as any).loadDependencies = (BetterSqlite3DriverPatched.prototype as any).loadDependencies;

export function monkeypatch() {
  // tslint: disable-next-line
  EntityManager.prototype.transaction = async function <T>(arg1: any,  arg2?: any): Promise<T> {
    if (this.queryRunner && this.queryRunner.isReleased) {
      throw new QueryRunnerProviderAlreadyReleasedError();
    }
    if (this.queryRunner && this.queryRunner.isTransactionActive) {
      throw new Error(`Cannot start transaction because its already started`);
    }
    const queryRunner = this.connection.createQueryRunner();
    const runInTransaction = typeof arg1 === 'function' ? arg1 : arg2;
    try {
      await queryRunner.startTransaction();
      const result = await runInTransaction(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      try {
        // we throw original error even if rollback thrown an error
        await queryRunner.rollbackTransaction();
        // tslint: disable-next-line
      } catch (rollbackError) {
        // tslint: disable-next-line
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  };
}