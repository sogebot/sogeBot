import { MigrationInterface, QueryRunner } from 'typeorm';

export class mediaLongtext1573943514152 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `alert_media` MODIFY COLUMN `b64data` longtext', undefined);
    await queryRunner.query('ALTER TABLE `gallery` MODIFY COLUMN `data` longtext', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `alert_media` MODIFY COLUMN `b64data` text', undefined);
    await queryRunner.query('ALTER TABLE `gallery` MODIFY COLUMN `data` text', undefined);
  }

}
