import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

// Cache mirror from tags endpoint
/* {
      "tag_id": "621fb5bf-5498-4d8f-b4ac-db4d40d401bf",
      "is_auto": false,
      "localization_names": {
        "bg-bg": "Завършване без продължаване",
        "cs-cz": "Na jeden z&aacute;tah", "da-dk": "1 Continue klaret",
        "de-de": "Mit nur 1 Leben",
        "el-gr": "1 χωρίς συνέχεια",
        "en-us": "1 Credit Clear",
        ...
      },
      "localization_descriptions": {
        "bg-bg": "За потоци с акцент върху завършване на аркадна игра с монети, в която не се използва продължаване",
        "cs-cz": "Pro vys&iacute;l&aacute;n&iacute; s důrazem na plněn&iacute; mincov&yacute;ch ark&aacute;dov&yacute;ch her bez použit&iacute; pokračov&aacute;n&iacute;.",
        "da-dk": "Til streams med v&aelig;gt p&aring; at gennemf&oslash;re et arkadespil uden at bruge continues",
        "de-de": "F&uuml;r Streams mit dem Ziel, ein Coin-op-Arcade-Game mit nur einem Leben abzuschlie&szlig;en.",
        "el-gr": "Για μεταδόσεις με έμφαση στην ολοκλήρωση παλαιού τύπου ηλεκτρονικών παιχνιδιών που λειτουργούν με κέρμα, χωρίς να χρησιμοποιούν συνέχειες",
        "en-us": "For streams with an emphasis on completing a coin-op arcade game without using any continues",
        ...
      }
    },
    {
      "tag_id": "7b49f69a-5d95-4c94-b7e3-66e2c0c6f6c6",
      "is_auto": false,
      "localization_names": {
        "bg-bg": "Дизайн",
        "cs-cz": "Design",
        "da-dk": "Design",
        "de-de": "Design",
        "el-gr": "Σχέδιο",
        "en-us": "Design",
        ...
      },
      "localization_descriptions": {
        "en-us": "For streams with an emphasis on the creative process of designing an object or system"
      }
    },
    {
      "tag_id": "1c628b75-b1c3-4a2f-9d1d-056c1f555f0e",
      "is_auto": true,
      "localization_names": {
        "bg-bg": "Шампион: Lux",
        "cs-cz": "Šampion: Lux",
        "da-dk": "Champion: Lux",
        ...
      },
      "localization_descriptions": {
      "en-us": "For streams featuring the champion Lux in League of Legends"
    }
*/

@Entity()
export class TwitchTag {
  @PrimaryColumn()
  tag_id!: string;
  @Column()
  is_auto!: boolean;
  @Column({ default: false })
  is_current!: boolean;

  @OneToMany(() => TwitchTagLocalizationName, (entity) => entity.tag, {
    cascade: true,
  })
  localization_names!: TwitchTagLocalizationName[];

  @OneToMany(() => TwitchTagLocalizationDescription, (entity) => entity.tag, {
    cascade: true,
  })
  localization_descriptions!: TwitchTagLocalizationDescription[];
};

@Entity()
export class TwitchTagLocalizationName {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  locale!: string;
  @Column()
  value!: string;

  @ManyToOne(() => TwitchTag, (entity) => entity.localization_names, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'tagId' })
  tag!: TwitchTag;
  @Column({ name: 'tagId', nullable: true })
  @Index()
  tagId!: string | null;
}

@Entity()
export class TwitchTagLocalizationDescription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  locale!: string;
  @Column()
  value!: string;

  @ManyToOne(() => TwitchTag, (entity) => entity.localization_descriptions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'tagId' })
  tag!: TwitchTag;
  @Column({ name: 'tagId', nullable: true })
  @Index()
  tagId!: string | null;
}

@Entity()
export class TwitchStats {
  @Column('bigint', {
    transformer: new ColumnNumericTransformer(),
    primary: true,
  })
  whenOnline!: number;

  @Column({ default: 0 })
  currentViewers!: number;
  @Column({ default: 0 })
  currentSubscribers!: number;
  @Column('bigint', {
    transformer: new ColumnNumericTransformer(),
  })
  currentBits!: number;
  @Column('bigint', {
    transformer: new ColumnNumericTransformer(),
  })
  currentTips!: number;
  @Column('bigint', {
    transformer: new ColumnNumericTransformer(),
  })
  chatMessages!: number;
  @Column({ default: 0 })
  currentFollowers!: number;
  @Column({ default: 0 })
  currentViews!: number;
  @Column({ default: 0 })
  maxViewers!: number;
  @Column({ default: 0 })
  currentHosts!: number;
  @Column({ default: 0 })
  newChatters!: number;
  @Column('bigint', {
    transformer: new ColumnNumericTransformer(),
  })
  currentWatched!: number;
}

@Entity()
export class TwitchClips {
  @PrimaryColumn()
  clipId!: string;

  @Column()
  isChecked!: boolean;
  @Column('bigint', {
    transformer: new ColumnNumericTransformer(),
  })
  shouldBeCheckedAt!: number;
}