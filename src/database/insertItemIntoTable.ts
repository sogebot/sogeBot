import { QueryRunner } from 'typeorm';

export const insertItemIntoTable = async (tableName: string, item: any, queryRunner: QueryRunner) => {
  const quote = process.env.TYPEORM_CONNECTION === 'mysql' ? '`' : '"';

  const keys = Object.keys(item);
  await queryRunner.query(
    `INSERT INTO ${quote}${tableName}${quote}(${keys.map(o => `${quote}${o}${quote}`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
    keys.map(key => item[key]),
  );
};