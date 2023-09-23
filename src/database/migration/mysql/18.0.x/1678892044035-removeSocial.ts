import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeSocial1678892044035 implements MigrationInterface {
  name = 'removeSocial1678892044035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`widget_social\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
