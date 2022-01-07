import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAlertParries1630924716945 implements MigrationInterface {
  name = 'addAlertParries1630924716945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // get all alerts
    const alerts = {} as any;
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      alerts[type]  = await queryRunner.query(`SELECT * FROM alert_${type}`);
    }
    alerts.global = await queryRunner.query('SELECT * FROM alert');

    await queryRunner.query(`DELETE FROM "alert" WHERE 1=1`);
    await queryRunner.query(`ALTER TABLE "alert" ADD "parry" text NOT NULL`);

    for (const alert of alerts.global) {
      alert.parry = JSON.stringify({
        enabled: false,
        delay:   0,
      }) as any;
      const keys = Object.keys(alert);
      await queryRunner.query(
        `INSERT INTO "alert"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        [keys.map(key => alert[key])],
      );
    }

    // resave all alerts
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      await queryRunner.query(`DELETE FROM "alert_${type}" WHERE 1=1`);
      for (const alert of alerts[type]) {
        const keys = Object.keys(alert);
        await queryRunner.query(
          `INSERT INTO "alert_${type}"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
          [keys.map(key => alert[key])],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert" DROP COLUMN "parry"`);
  }

}
