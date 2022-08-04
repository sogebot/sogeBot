import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeFollowersAttributes1659639416171 implements MigrationInterface {
  name = 'removeFollowersAttributes1659639416171';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cooldown" DROP COLUMN "isFollowerAffected"`);
    await queryRunner.query(`ALTER TABLE "queue" DROP COLUMN "isFollower"`);
    await queryRunner.query(`ALTER TABLE "raffle" DROP COLUMN "forFollowers"`);
    await queryRunner.query(`ALTER TABLE "raffle_participant" DROP COLUMN "isFollower"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isFollower"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "haveFollowerLock"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "haveFollowedAtLock"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "followCheckAt"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "followedAt"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}