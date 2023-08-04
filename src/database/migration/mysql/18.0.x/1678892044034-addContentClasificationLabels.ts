import { MigrationInterface, QueryRunner } from 'typeorm';

export class addContentClasificationLabels1678892044034 implements MigrationInterface {
  name = 'addContentClasificationLabels1678892044034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`cache_titles\` ADD \`content_classification_labels\` text NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
