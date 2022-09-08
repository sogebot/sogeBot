import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAlertParries1630924716945 implements MigrationInterface {
  name = 'addAlertParries1630924716945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // get all alerts
    const alerts = {} as any;
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      alerts[type]  = await queryRunner.query(`SELECT * FROM alert_${type}`);
    }
    alerts.global = await queryRunner.query('SELECT * FROM alert');

    await queryRunner.query(`DELETE FROM "alert" WHERE 1=1`);
    await queryRunner.query(`ALTER TABLE "alert" ADD "parry" text NOT NULL`);

    for (const alert of alerts.global) {
      alert.loadStandardProfanityList = JSON.parse(alert.loadStandardProfanityList) as any;
      alert.tts = JSON.parse(alert.tts) as any;
      alert.fontMessage = JSON.parse(alert.fontMessage) as any;
      alert.font = JSON.parse(alert.font) as any;

      await queryRunner.manager.getRepository(`alert`).insert({
        ...alert,
        parry: {
          enabled: false,
          delay:   0,
        },
      });
    }

    // resave all alerts
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      await queryRunner.manager.getRepository(`alert_${type}`).clear();
      for (const alert of alerts[type]) {
        alert.enabled = alert.enabled === '0';
        alert.animationTextOptions = JSON.parse(alert.animationTextOptions) as any;
        alert.imageOptions = JSON.parse(alert.imageOptions) as any;
        alert.advancedMode = JSON.parse(alert.advancedMode) as any;
        alert.tts = JSON.parse(alert.tts) as any;
        alert.font = JSON.parse(alert.font) as any;
        if (['tip', 'cheer', 'resub', 'reward_redeem'].includes(type)) {
          alert.message = JSON.parse(alert.message) as any;
        }
        await queryRunner.manager.getRepository(`alert_${type}`).insert(alert);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert" DROP COLUMN "parry"`);
  }
}
