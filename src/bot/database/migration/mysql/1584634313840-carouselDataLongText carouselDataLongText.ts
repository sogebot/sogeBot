import { MigrationInterface, QueryRunner } from 'typeorm';

export class carouselDataLongText1584634313840 implements MigrationInterface {
  name = 'carouselDataLongText1584634313840';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `carousel` MODIFY `base64` longtext NOT NULL', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `carousel` MODIFY `base64` text NOT NULL', undefined);
  }

}
