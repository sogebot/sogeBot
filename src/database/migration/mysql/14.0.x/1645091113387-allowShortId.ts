import { MigrationInterface, QueryRunner } from 'typeorm';

export class allowShortId1645091113387 implements MigrationInterface {
  name = 'allowShortId1645091113387';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`gallery\` MODIFY COLUMN \`id\` varchar(255) NOT NULL PRIMARY KEY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
