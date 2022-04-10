import { MigrationInterface, QueryRunner } from 'typeorm';

export class googlePrivateKeysText1645019207861 implements MigrationInterface {
  name = 'googlePrivateKeysText1645019207861';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`google_private_keys\` MODIFY \`privateKey\` text NOT NULL`);
  }

  public async down() {
    return true;
  }

}
