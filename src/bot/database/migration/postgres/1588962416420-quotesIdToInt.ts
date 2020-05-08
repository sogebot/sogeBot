import {MigrationInterface, QueryRunner} from 'typeorm';

export class quotesIdToInt1588962416420 implements MigrationInterface {
  name = 'quotesIdToInt1588962416420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE quotes ALTER COLUMN id SET DATA TYPE SERIAL NOT NULL;`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE quotes ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());`, undefined);
  }

}
