import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateHLTB1665996411181 implements MigrationInterface {
  name = 'updateHLTB1665996411181';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "how_long_to_beat_game"`);
    const items2 = await queryRunner.query(`SELECT * from "how_long_to_beat_game_item"`);

    await queryRunner.query(`DROP TABLE "how_long_to_beat_game"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game_item"`);

    console.log({ items, items2 });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
