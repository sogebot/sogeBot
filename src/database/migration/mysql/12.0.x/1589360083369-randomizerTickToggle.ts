import { MigrationInterface, QueryRunner } from 'typeorm';

export class randomizerTickToggle1589360083369 implements MigrationInterface {
  name = 'randomizerTickToggle1589360083369';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const randomizers = await queryRunner.query('SELECT * from `randomizer`');
    const randomizersItems = await queryRunner.query('SELECT * from `randomizer_item`');
    await queryRunner.clearTable('randomizer_item');
    await queryRunner.query('DELETE FROM `randomizer` WHERE 1=1');
    await queryRunner.query('ALTER TABLE `randomizer` ADD `shouldPlayTick` tinyint NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `randomizer` ADD `tickVolume` integer NOT NULL', undefined);

    for (const randomizer of randomizers) {
      await queryRunner.query(
        `INSERT INTO \`randomizer\`(${Object.keys(randomizer).map(o=>`\`${o}\``).join(', ')}, \`shouldPlayTick\`, \`tickVolume\`) values(${Object.keys(randomizer).map(o => `"${randomizer[o]}"`)}, 1, 100)`,
      );
    }
    for (const randomizer of randomizersItems) {
      await queryRunner.query(
        `INSERT INTO \`randomizer_item\`(${Object.keys(randomizer).map(o=>`\`${o}\``).join(', ')}) values(${Object.keys(randomizer).map(o => `"${randomizer[o]}"`)})`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `randomizer` DROP COLUMN `tickVolume`', undefined);
    await queryRunner.query('ALTER TABLE `randomizer` DROP COLUMN `shouldPlayTick`', undefined);
  }

}
