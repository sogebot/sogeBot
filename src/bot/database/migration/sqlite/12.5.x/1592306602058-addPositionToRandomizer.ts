import { MigrationInterface, QueryRunner } from 'typeorm';

const positionDefaultValues = {
  x: 0, y: 0, anchorX: 'left', anchorY: 'top',
};

export class addPositionToRandomizer1592306602058 implements MigrationInterface {
  name = 'addPositionToRandomizer1592306602058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const randomizers = await queryRunner.query(`SELECT * from randomizer`);
    const randomizersItems = await queryRunner.query(`SELECT * from randomizer_item`);

    await queryRunner.query(`DROP INDEX "idx_randomizer_cmdunique"`, undefined);
    await queryRunner.query(`DROP TABLE "randomizer"`, undefined);
    await queryRunner.query(`CREATE TABLE "randomizer" ("id" varchar PRIMARY KEY NOT NULL, "widgetOrder" integer NOT NULL, "createdAt" bigint NOT NULL DEFAULT (0), "command" varchar NOT NULL, "isShown" boolean NOT NULL DEFAULT (0), "type" varchar(20) NOT NULL DEFAULT ('simple'), "customizationFont" text NOT NULL, "permissionId" varchar NOT NULL, "name" varchar NOT NULL, "tts" text NOT NULL, "shouldPlayTick" boolean NOT NULL, "tickVolume" integer NOT NULL, "position" text not null)`, undefined);
    await queryRunner.clearTable('randomizer_item');

    for (const randomizer of randomizers) {
      await queryRunner.query(
        `INSERT INTO randomizer(${Object.keys(randomizer).join(', ')}, position) values(${Object.keys(randomizer).map(o => '?')}, ?)`, [ ...Object.keys(randomizer).map(key => randomizer[key]), JSON.stringify(positionDefaultValues) ],
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
    await queryRunner.query(`CREATE TABLE "randomizer" ("id" varchar PRIMARY KEY NOT NULL, "widgetOrder" integer NOT NULL, "createdAt" bigint NOT NULL DEFAULT (0), "command" varchar NOT NULL, "isShown" boolean NOT NULL DEFAULT (0), "type" varchar(20) NOT NULL DEFAULT ('simple'), "customizationFont" text NOT NULL, "permissionId" varchar NOT NULL, "name" varchar NOT NULL)`, undefined);
    await queryRunner.clearTable('randomizer_item');

    for (const randomizer of randomizers) {
      await queryRunner.query(
        `INSERT INTO randomizer(${Object.keys(randomizer).filter(o => o !== 'position').join(', ')}) values(${Object.keys(randomizer).map(o => '?')})`, [ ...Object.keys(randomizer).filter(o => o !== 'position').map(key => randomizer[key]) ],
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
