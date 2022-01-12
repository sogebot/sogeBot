import { MigrationInterface, QueryRunner } from 'typeorm';

export class addLoopAttr1641559036884 implements MigrationInterface {
  name = 'addLoopAttr1641559036884';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // get all alerts
    const alerts = {} as any;
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      alerts[type]  = await queryRunner.query(`SELECT * FROM \`alert_${type}\``);
    }
    // resave all alerts
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      await queryRunner.query(`DELETE FROM \`alert_${type}\` WHERE 1=1`);
      for (const alert of alerts[type]) {
        const keys = Object.keys(alert);
        alert.imageOptions = JSON.stringify({
          ...(JSON.parse(alert.imageOptions) as Record<string, any>),
          loop: false,
        });
        await queryRunner.query(
          `INSERT INTO \`alert_${type}\`(${keys.map(o => `\`${o}\``).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
          keys.map(key => alert[key]),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
