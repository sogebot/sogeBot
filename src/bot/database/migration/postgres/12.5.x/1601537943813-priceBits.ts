import { MigrationInterface, QueryRunner } from 'typeorm';

export class priceBits1601537943813 implements MigrationInterface {
  name = 'priceBits1601537943813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "price" ADD "priceBits" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "price" ADD "emitRedeemEvent" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`CREATE TABLE "alert_command_redeem" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "alertId" uuid, "enabled" boolean NOT NULL, "title" character varying NOT NULL, "variantCondition" character varying NOT NULL, "variantAmount" integer NOT NULL, "messageTemplate" character varying NOT NULL, "layout" character varying NOT NULL, "animationIn" character varying NOT NULL, "animationInDuration" integer NOT NULL DEFAULT 2000, "animationOut" character varying NOT NULL, "animationOutDuration" integer NOT NULL DEFAULT 2000, "animationText" character varying NOT NULL, "animationTextOptions" text NOT NULL, "imageId" character varying NOT NULL, "soundId" character varying NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text NOT NULL, CONSTRAINT "PK_77923a3442bc2c142798ffb6842" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" ADD CONSTRAINT "FK_d118fd8e1d7f331372e95b7e235" FOREIGN KEY ("alertId") REFERENCES "alert"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "price" DROP COLUMN "emitRedeemEvent"`);
    await queryRunner.query(`ALTER TABLE "price" DROP COLUMN "priceBits"`);
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" DROP CONSTRAINT "FK_d118fd8e1d7f331372e95b7e235"`);
    await queryRunner.query(`DROP TABLE "alert_command_redeem"`);
  }

}
