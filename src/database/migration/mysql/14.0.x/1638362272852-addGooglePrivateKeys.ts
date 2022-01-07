import { MigrationInterface, QueryRunner } from 'typeorm';

export class addGooglePrivateKeys1638362272852 implements MigrationInterface {
  name = 'addGooglePrivateKeys1638362272852';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`google_private_keys\` (\`id\` char(36) NOT NULL, \`clientEmail\` varchar(255) NOT NULL, \`privateKey\` varchar(255) NOT NULL, \`createdAt\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`google_private_keys\``);
  }

}
