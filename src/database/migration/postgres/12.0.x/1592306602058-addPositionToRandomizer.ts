import { MigrationInterface, QueryRunner } from 'typeorm';

const positionDefaultValues = {
  x: 0, y: 0, anchorX: 'left', anchorY: 'top',
};

export class addPositionToRandomizer1592306602058 implements MigrationInterface {
  name = 'addPositionToRandomizer1592306602058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const randomizers = await queryRunner.query(`SELECT * from "randomizer"`);
    const randomizersItems = await queryRunner.query(`SELECT * from "randomizer_item"`);
    await queryRunner.clearTable('randomizer_item');
    await queryRunner.query('DELETE FROM "randomizer" WHERE 1=1');
    await queryRunner.query(`ALTER TABLE "randomizer" ADD "position" text NOT NULL`, undefined);

    for (const randomizer of randomizers) {
      await queryRunner.query(
        `INSERT INTO "randomizer"(${Object.keys(randomizer).map(o=>`"${o}"`).join(', ')}, "position") values(${Object.keys(randomizer).map(o => `'${randomizer[o]}'`)}, '${JSON.stringify(positionDefaultValues)}')`,
      );
    }
    for (const randomizer of randomizersItems) {
      await queryRunner.query(
        `INSERT INTO "randomizer_item"(${Object.keys(randomizer).map(o=>`"${o}"`).join(', ')}) values(${Object.keys(randomizer).map(o => `'${randomizer[o]}'`)})`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "randomizer" DROP COLUMN "position"`, undefined);
  }

}
