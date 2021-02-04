import { MigrationInterface, QueryRunner } from 'typeorm';

export class multipleSongRequestWithSameVideoId1573998223383 implements MigrationInterface {
  name = 'multipleSongRequestWithSameVideoId1573998223383';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `song_request` ADD `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `song_request` DROP PRIMARY KEY', undefined);
    await queryRunner.query('ALTER TABLE `song_request` ADD PRIMARY KEY (`id`)', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `song_request` DROP PRIMARY KEY', undefined);
    await queryRunner.query('ALTER TABLE `song_request` ADD PRIMARY KEY (`videoId`)', undefined);
    await queryRunner.query('ALTER TABLE `song_request` DROP COLUMN `id`', undefined);
  }

}
