import {MigrationInterface, QueryRunner} from 'typeorm';

export class pollIsOpenedIdx1602070380846 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "IDX_poll_isOpened" ON "poll" ("isOpened") `);
    await queryRunner.query(`ALTER TABLE "poll" ALTER COLUMN "type" TYPE character varying(7) NOT NULL`);


  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "poll" ALTER COLUMN "type" TYPE character varying(6) NOT NULL`);
    await queryRunner.query(`DROP INDEX "IDX_poll_isOpened"`);
  }

}
