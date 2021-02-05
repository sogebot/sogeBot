import { MigrationInterface, QueryRunner } from 'typeorm';

const ttsDefaultValues = {
  enabled: false, pitch: 1, rate: 1, voice: 'UK English Female', volume: 0.5,
};

export class addTTSToRandomizer1587638203596 implements MigrationInterface {
  name = 'addTTSToRandomizer1587638203596';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const randomizers = await queryRunner.query(`SELECT * from "randomizer"`);
    const randomizersItems = await queryRunner.query(`SELECT * from "randomizer_item"`);
    await queryRunner.clearTable('randomizer_item');
    await queryRunner.query('DELETE FROM "randomizer" WHERE 1=1');
    await queryRunner.query(`ALTER TABLE "randomizer" ADD "tts" text NOT NULL`, undefined);

    for (const randomizer of randomizers) {
      await queryRunner.query(
        `INSERT INTO "randomizer"(${Object.keys(randomizer).map(o=>`"${o}"`).join(', ')}, "tts") values(${Object.keys(randomizer).map(o => `'${randomizer[o]}'`)}, '${JSON.stringify(ttsDefaultValues)}')`,
      );
    }
    for (const randomizer of randomizersItems) {
      await queryRunner.query(
        `INSERT INTO "randomizer_item"(${Object.keys(randomizer).map(o=>`"${o}"`).join(', ')}) values(${Object.keys(randomizer).map(o => `'${randomizer[o]}'`)})`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "randomizer" DROP COLUMN "tts"`, undefined);
  }

}
