import { MigrationInterface, QueryRunner } from 'typeorm';

export class eventlistIsTestAttr1593591475193 implements MigrationInterface {
  name = 'eventlistIsTestAttr1593591475193';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const events = await queryRunner.query(`SELECT * from event_list`);

    await queryRunner.query('DELETE FROM \`event_list\` WHERE 1=1');
    await queryRunner.query(`ALTER TABLE \`event_list\` ADD \`isTest\` tinyint NOT NULL`, undefined);

    for (const event of events) {
      await queryRunner.query(
        `INSERT INTO \`event_list\`(${Object.keys(event).map(o=>`\`${o}\``).join(', ')}, \`isTest\`) values(${Object.keys(event).map(o => `'${event[o]}'`)}, 'false')`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`event_list\` DROP COLUMN \`isTest\``, undefined);
  }

}
