import { MigrationInterface, QueryRunner } from 'typeorm';

export class addKeywordGroup1635453652529 implements MigrationInterface {
  name = 'addKeywordGroup1635453652529';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`keyword_group\` (\`name\` varchar(255) NOT NULL, \`options\` text NOT NULL, UNIQUE INDEX \`IDX_keyword_group_unique_name\` (\`name\`), PRIMARY KEY (\`name\`)) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`keyword\` ADD \`group\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`keyword_responses\` CHANGE \`permission\` \`permission\` varchar(255) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`keyword_responses\` CHANGE \`permission\` \`permission\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`keyword\` DROP COLUMN \`group\``);
    await queryRunner.query(`DROP INDEX \`IDX_keyword_group_unique_name\` ON \`keyword_group\``);
    await queryRunner.query(`DROP TABLE \`keyword_group\``);
  }

}
