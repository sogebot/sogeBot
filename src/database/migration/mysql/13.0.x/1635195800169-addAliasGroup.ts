import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAliasGroup1635195800169 implements MigrationInterface {
  name = 'addAliasGroup1635195800169';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`alias_group\` (\`name\` varchar(255) NOT NULL, \`options\` text NOT NULL, UNIQUE INDEX \`IDX_alias_group_unique_name\` (\`name\`), PRIMARY KEY (\`name\`)) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`alias\` CHANGE \`permission\` \`permission\` varchar(255) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`alias\` CHANGE \`permission\` \`permission\` varchar(255) NOT NULL`);
    await queryRunner.query(`DROP INDEX \`IDX_alias_group_unique_name\` ON \`alias_group\``);
    await queryRunner.query(`DROP TABLE \`alias_group\``);
  }

}