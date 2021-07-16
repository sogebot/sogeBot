import { MigrationInterface, QueryRunner } from 'typeorm';

export class TTSMinAmountToShow1582230220319 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    for (const type of ['cheer', 'follow', 'host', 'raid', 'resub', 'sub', 'subgift', 'tip']) {
      const alerts = await queryRunner.query(`SELECT * from "alert_${type}"`, undefined);
      for (const alert of alerts) {
        const tts = {
          ...(JSON.parse(alert.tts) as any),
          minAmountToPlay: 0,
        };
        await queryRunner.query(`UPDATE "alert_${type}" SET "tts"="${JSON.stringify(tts)}" WHERE "id"="${alert.id}"`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    for (const type of ['cheer', 'follow', 'host', 'raid', 'resub', 'sub', 'subgift', 'tip']) {
      const alerts = await queryRunner.query(`SELECT * from "alert_${type}"`, undefined);
      for (const alert of alerts) {
        const tts:any = JSON.parse(alert.tts);
        delete tts.minAmountToPlay;
        await queryRunner.query(`UPDATE "alert_${type}" SET "tts"="${JSON.stringify(tts)}" WHERE "id"="${alert.id}"`);
      }
    }
  }

}
