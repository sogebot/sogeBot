import { MigrationInterface, QueryRunner } from 'typeorm';

export class messageAlignmentForAlerts1608158764205 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const type of ['cheer', 'resub', 'tip', 'reward_redeem']) {
      const alerts = await queryRunner.query(`SELECT * from "alert_${type}"`, undefined);
      for (const alert of alerts) {
        const message:any = JSON.parse(alert.message);
        message.font.align = 'left';
        await queryRunner.query(`UPDATE "alert_${type}" SET "message"="${JSON.stringify(message)}" WHERE "id"="${alert.id}"`);
      }
    }
    for (const type of ['cheer', 'resub', 'tip', 'reward_redeem', 'command_redeem', 'raid', 'host', 'subgift', 'subcommunitygift', 'sub', 'follow']) {
      const alerts = await queryRunner.query(`SELECT * from "alert_${type}"`, undefined);
      for (const alert of alerts) {
        const font:any = JSON.parse(alert.font);
        font.align = 'center';
        await queryRunner.query(`UPDATE "alert_${type}" SET "font"="${JSON.stringify(font)}" WHERE "id"="${alert.id}"`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const type of ['cheer', 'resub', 'tip', 'reward_redeem']) {
      const alerts = await queryRunner.query(`SELECT * from "alert_${type}"`, undefined);
      for (const alert of alerts) {
        const message:any = JSON.parse(alert.message);
        delete message.font.align;
        await queryRunner.query(`UPDATE "alert_${type}" SET "message"="${JSON.stringify(message)}" WHERE "id"="${alert.id}"`);
      }
    }
    for (const type of ['cheer', 'resub', 'tip', 'reward_redeem', 'command_redeem', 'raid', 'host', 'subgift', 'subcommunitygift', 'sub', 'follow']) {
      const alerts = await queryRunner.query(`SELECT * from "alert_${type}"`, undefined);
      for (const alert of alerts) {
        const font:any = JSON.parse(alert.font);
        delete font.align;
        await queryRunner.query(`UPDATE "alert_${type}" SET "font"="${JSON.stringify(font)}" WHERE "id"="${alert.id}"`);
      }
    }
  }

}
