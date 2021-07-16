import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeTTSkeys1622378375127 implements MigrationInterface {
  name = 'removeTTSkeys1622378375127';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // get all alerts
    const alerts = {} as any;
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      alerts[type]  = await queryRunner.manager.getRepository(`alert_${type}`).find();
    }

    // resave all alerts
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      for (const alert of alerts[type]) {
        delete alert.tts.pitch;
        delete alert.tts.rate;
        delete alert.tts.volume;
        delete alert.tts.voice;
        if (alert.font && !alert.font.shadow) {
          alert.font.shadow = [];
        }
        if (alert.message && alert.message.font) {
          if (!alert.message.font.shadow) {
            alert.message.font.shadow = [];
          }
        }
        await queryRunner.manager.getRepository(`alert_${type}`).save(alert);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
