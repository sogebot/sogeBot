import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateCustomVariables1666167883936 implements MigrationInterface {
  name = 'updateCustomVariables1666167883936';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`variable\` DROP COLUMN \`runEveryTypeValue\``);
    await queryRunner.query(`ALTER TABLE \`variable\` DROP COLUMN \`runEveryType\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
