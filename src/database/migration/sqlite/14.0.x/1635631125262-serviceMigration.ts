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

    const items2 = (await queryRunner.query(`SELECT * from "settings"`)).filter((o: any) => {
      return o.namespace === '/core/eventsub';
    });

    for (const item of items2) {
      console.log(item.name);
      if (item.name === 'useTunneling' || item.name === 'domain' || item.name === 'appToken' || item.name === 'secret') {
        await queryRunner.query(`UPDATE "settings" SET "namespace"='/services/twitch' WHERE "id"='${item.id}'`);
      } else {
        await queryRunner.query(`UPDATE "settings" SET "namespace"='/services/twitch', "name"='eventSub${item.name.charAt(0).toUpperCase() + item.name.slice(1)}' WHERE "id"='${item.id}'`);
      }

    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Please revert you db from backup.');
  }

}
