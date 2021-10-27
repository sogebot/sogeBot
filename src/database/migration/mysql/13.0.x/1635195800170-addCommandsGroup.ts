import { MigrationInterface, QueryRunner } from 'typeorm';

export class addCommandsGroup1635195800170 implements MigrationInterface {
  name = 'addCommandsGroup1635195800170';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`commands_group\` (\`name\` varchar(255) NOT NULL, \`options\` text NOT NULL, UNIQUE INDEX \`IDX_commands_group_unique_name\` (\`name\`), PRIMARY KEY (\`name\`)) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`commands\` ADD \`group\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`commands_responses\` CHANGE \`permission\` \`permission\` varchar(255) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`commands_responses\` CHANGE \`permission\` \`permission\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`commands\` DROP COLUMN \`group\``);
    await queryRunner.query(`DROP INDEX \`IDX_commands_group_unique_name\` ON \`commands_group\``);
    await queryRunner.query(`DROP TABLE \`commands_group\``);
  }
}