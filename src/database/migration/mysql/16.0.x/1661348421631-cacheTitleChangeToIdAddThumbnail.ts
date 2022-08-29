import { MigrationInterface, QueryRunner } from 'typeorm';

export class cacheTitleChangeToIdAddThumbnail1661348421631 implements MigrationInterface {
  name = 'cacheTitleChangeToIdAddThumbnail1661348421631';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`cache_games\` ADD \`thumbnail\` varchar(255) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
