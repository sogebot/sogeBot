import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeVariableWatch1666167883934 implements MigrationInterface {
  name = 'removeVariableWatch1666167883934';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`variable_watch\``, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
