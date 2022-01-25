import shortid from 'shortid';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class moveAlertMediaToGallery1643061611856 implements MigrationInterface {
  name = 'moveAlertMediaToGallery1643061611856';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const mapper = new Map<string, string | null>();
    const items = await queryRunner.query(`SELECT b64data FROM alert_media GROUP BY b64data`);
    for (const item of items) {
      const ids = (await queryRunner.query(`SELECT id FROM alert_media WHERE b64data=$1`, [item.b64data])).map((o: any) => o.id);

      if (item.b64data.length > 0) {
        try {
          const type = (item.b64data.match(/^data:([0-9A-Za-z-+/]+);base64,(.+)$/))[1];
          // save new file and get new id
          const id = shortid();
          await queryRunner.query(`INSERT INTO gallery(id, type, data, name, folder) VALUES($1, $2, $3, $4, $5)`,
            [id, type, item.b64data, id, '/alerts/migration']);

          // save mapper ids
          for (const itemid of ids) {
            mapper.set(itemid, id);
          }
        } catch(e) {
          for (const itemid of ids) {
            mapper.set(itemid, '_default_');
          }
        }
      } else {
        // save mapper ids
        for (const itemid of ids) {
          mapper.set(itemid, null);
        }
      }
    }

    for (const type of ['cheer', 'command_redeem', 'follow', 'host', 'raid', 'resub', 'reward_redeem', 'sub', 'subcommunitygift', 'subgift', 'tip']) {
      const alerts = await queryRunner.query(`SELECT * from \`alert_${type}\``, undefined);
      for (const alert of alerts) {
        const imageId = mapper.get(alert.imageId) || null;
        const soundId = mapper.get(alert.soundId) || null;
        await queryRunner.query(`UPDATE \`alert_${type}\` SET imageId=$1, soundId=$2 WHERE id='${alert.id}'`, [ imageId, soundId ]);
      }
    }
    await queryRunner.query(`DROP TABLE alert_media`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
