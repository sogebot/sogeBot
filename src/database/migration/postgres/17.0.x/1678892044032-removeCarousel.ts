import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeCarousel1678892044032 implements MigrationInterface {
  name = 'removeCarousel1678892044032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "carousel"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
