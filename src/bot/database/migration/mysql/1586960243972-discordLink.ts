import {MigrationInterface, QueryRunner, Table} from 'typeorm';

export class discordLink1586960243972 implements MigrationInterface {
  name = 'discordLink1586960243972';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'discord_link',
      columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true, isGenerated: true},
        { name: 'tag', type: 'varchar', length: '255' },
        { name: 'createdAt', type: 'bigint' },
        { name: 'userId', type: 'int', isNullable: true },
      ],
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('discord_link', undefined);
  }

}
