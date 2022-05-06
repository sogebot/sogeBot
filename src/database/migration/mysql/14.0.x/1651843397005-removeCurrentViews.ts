import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeCurrentViews1651843397005 implements MigrationInterface {
  name = 'removeCurrentViews1651843397005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`twitch_stats\` DROP COLUMN \`currentViews\``);

    let µWidgets = (await queryRunner.query(`SELECT * from \`settings\` `)).find((o: any) => {
      return o.namespace === '/core/dashboard' && o.name === 'µWidgets';
    })?.value;

    if (µWidgets) {
      µWidgets = µWidgets.filter((o: any) => !o.includes('|views|'));
      await queryRunner.query(`UPDATE \`settings\` SET \`value\`="${JSON.stringify(µWidgets)}" WHERE \`name\`="µWidgets"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`twitch_stats\` ADD \`currentViews\` int NOT NULL DEFAULT '0'`);
  }

}
