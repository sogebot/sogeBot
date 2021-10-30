import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeChecklistId1635599216109 implements MigrationInterface {
  name = 'changeChecklistId1635599216109';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`checklist\` DROP COLUMN \`value\``);
    await queryRunner.query(`ALTER TABLE \`checklist\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`checklist\` DROP COLUMN \`id\``);
    await queryRunner.query(`ALTER TABLE \`checklist\` ADD \`id\` varchar(255) NOT NULL PRIMARY KEY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`checklist\` DROP COLUMN \`id\``);
    await queryRunner.query(`ALTER TABLE \`checklist\` ADD \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`checklist\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(`ALTER TABLE \`checklist\` ADD \`value\` varchar(255) NOT NULL`);
  }

}
