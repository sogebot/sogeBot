import { MigrationInterface, QueryRunner } from 'typeorm';

export class multipleSongRequestWithSameVideoId1573998123801 implements MigrationInterface {
  name = 'multipleSongRequestWithSameVideoId1573998123801';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "song_request" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" DROP CONSTRAINT "PK_54c0e42814d77cc6828ff6acf54"`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" ADD CONSTRAINT "PK_0f9ab226681c58eb20a3fe59430" PRIMARY KEY ("videoId", "id")`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" DROP CONSTRAINT "PK_0f9ab226681c58eb20a3fe59430"`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" ADD CONSTRAINT "PK_c2b53ff7f5fc5bf370a3f32ebf8" PRIMARY KEY ("id")`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "song_request" DROP CONSTRAINT "PK_c2b53ff7f5fc5bf370a3f32ebf8"`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" ADD CONSTRAINT "PK_0f9ab226681c58eb20a3fe59430" PRIMARY KEY ("videoId", "id")`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" DROP CONSTRAINT "PK_0f9ab226681c58eb20a3fe59430"`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" ADD CONSTRAINT "PK_54c0e42814d77cc6828ff6acf54" PRIMARY KEY ("videoId")`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" DROP COLUMN "id"`, undefined);
  }

}
