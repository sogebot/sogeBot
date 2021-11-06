import { MigrationInterface, QueryRunner } from 'typeorm';

export class serviceMigration1635631125262 implements MigrationInterface {
  name = 'serviceMigration1635631125262';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = (await queryRunner.query(`SELECT * from "settings"`)).filter((o: any) => {
      return o.namespace === '/core/oauth'
        || o.namespace === '/core/tmi'
        || o.namespace === '/core/twitch';
    });
    for (const item of items) {
      await queryRunner.query(`UPDATE "settings" SET "namespace"='/services/twitch' WHERE "id"='${item.id}'`);
    }
    await queryRunner.query(`INSERT INTO "settings"("namespace", "value", "name") VALUES ('/services/twitch', '${JSON.stringify(true)}', 'enabled')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Please revert you db from backup.');
  }

}
