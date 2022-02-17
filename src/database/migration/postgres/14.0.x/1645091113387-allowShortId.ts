import { MigrationInterface, QueryRunner } from 'typeorm';

export class allowShortId1645091113387 implements MigrationInterface {
  name = 'allowShortId1645091113387';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gallery" DROP CONSTRAINT "PK_65d7a1ef91ddafb3e7071b188a0"`);
    await queryRunner.query(`ALTER TABLE "gallery" ALTER COLUMN "id" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "gallery" ADD CONSTRAINT "PK_65d7a1ef91ddafb3e7071b188a0" PRIMARY KEY ("id")`);
    await queryRunner.query(`ALTER TABLE "gallery" ALTER COLUMN "id" DROP DEFAULT`);
    await queryRunner.query(`DROP SEQUENCE "gallery_id_seq"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
