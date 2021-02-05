import { MigrationInterface, QueryRunner } from 'typeorm';

export class randomizerTickToggle1589360083369 implements MigrationInterface {
  name = 'randomizerTickToggle1589360083369';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const randomizers = await queryRunner.query(`SELECT * from randomizer`);
    const randomizersItems = await queryRunner.query(`SELECT * from randomizer_item`);

    await queryRunner.query(`DROP INDEX "idx_randomizer_cmdunique"`, undefined);
    await queryRunner.query(`DROP TABLE "randomizer"`, undefined);
    await queryRunner.query(`CREATE TABLE "randomizer" ("id" varchar PRIMARY KEY NOT NULL, "widgetOrder" integer NOT NULL, "createdAt" bigint NOT NULL DEFAULT (0), "command" varchar NOT NULL, "isShown" boolean NOT NULL DEFAULT (0), "type" varchar(20) NOT NULL DEFAULT ('simple'), "customizationFont" text NOT NULL, "permissionId" varchar NOT NULL, "name" varchar NOT NULL, "tts" text NOT NULL, "shouldPlayTick" boolean NOT NULL, "tickVolume" integer NOT NULL)`, undefined);
    await queryRunner.clearTable('randomizer_item');

    for (const randomizer of randomizers) {
      await queryRunner.query(
        `INSERT INTO randomizer(${Object.keys(randomizer).join(', ')}, shouldPlayTick, tickVolume) values(${Object.keys(randomizer).map(o => '?')}, ?, ?)`, [ ...Object.keys(randomizer).map(key => randomizer[key]), 1, 100 ],
      );
    }
    for (const randomizer of randomizersItems) {
      await queryRunner.query(
        `INSERT INTO randomizer_item(${Object.keys(randomizer).join(', ')}) values(${Object.keys(randomizer).map(o => '?')})`, Object.keys(randomizer).map(key => randomizer[key]),
      );
    }

    await queryRunner.query(`CREATE UNIQUE INDEX "idx_randomizer_cmdunique" ON "randomizer" ("command") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const randomizers = await queryRunner.query(`SELECT * from randomizer`);
    const randomizerItems = await queryRunner.query(`SELECT * from randomizer_item`);

    await queryRunner.query(`DROP INDEX "idx_randomizer_cmdunique"`, undefined);
    await queryRunner.query(`DROP TABLE "randomizer"`, undefined);
    await queryRunner.query(`CREATE TABLE "randomizer" ("id" varchar PRIMARY KEY NOT NULL, "widgetOrder" integer NOT NULL, "createdAt" bigint NOT NULL DEFAULT (0), "command" varchar NOT NULL, "isShown" boolean NOT NULL DEFAULT (0), "type" varchar(20) NOT NULL DEFAULT ('simple'), "customizationFont" text NOT NULL, "permissionId" varchar NOT NULL, "name" varchar NOT NULL, "tts" text NOT NULL)`, undefined);

    for (const randomizer of randomizers) {
      await queryRunner.query(
        `INSERT INTO randomizer(${Object.keys(randomizer).filter(o => o !== 'shouldPlayTick' && o !== 'tickVolume').join(', ')}) values(${Object.keys(randomizer).map(o => '?')})`, [ ...Object.keys(randomizer).filter(o => o !== 'shouldPlayTick' && o !== 'tickVolume').map(key => randomizer[key]) ],
      );
    }
    for (const randomizer of randomizerItems) {
      await queryRunner.query(
        `INSERT INTO randomizer_item(${Object.keys(randomizer).join(', ')}) values(${Object.keys(randomizer).map(o => '?')})`, Object.keys(randomizer).map(key => randomizer[key]),
      );
    }

    await queryRunner.query(`CREATE UNIQUE INDEX "idx_randomizer_cmdunique" ON "randomizer" ("command") `, undefined);
  }

}
