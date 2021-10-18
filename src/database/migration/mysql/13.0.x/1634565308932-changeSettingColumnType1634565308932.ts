import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeSettingColumnType1634565308932 implements MigrationInterface {
  name = 'changeSettingColumnType1634565308932';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`settings\` MODIFY COLUMN \`value\` longtext NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`settings\` MODIFY COLUMN \`value\` text NOT NULL`);
  }

}