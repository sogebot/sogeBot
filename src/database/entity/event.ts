import { IsNotEmpty } from 'class-validator';
import { Column, PrimaryColumn } from 'typeorm';
import { Entity, BaseEntity } from 'typeorm';

export type SupportedOperation = {
  id: string,
  definitions: { [x: string]: string | boolean | number | string[] | boolean[] | number[] },
  fire: () => void,
};

export type SupportedEvent = {
  id: string,
  definitions: {
    [x: string]: string | boolean | number;
  },
  variables: string[],
};

export type Filter = {
  eventId: string,
  filters: string,
};

export type Operation = {
  key: string,
  eventId: string,
  definitions: {
    [x: string]: string | boolean | number;
  },
};

export type Attributes = {
  userId?: string,
  username?: string,
  reset?: boolean,
  [x: string]: any,
};

export type Operations = {
  id?: string;
  name: string;
  definitions: {
    [x: string]: string | boolean | number;
  };
};

@Entity()
export class Generic {
  @Column({ type: 'text' })
  @IsNotEmpty()
    name: string;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    triggered: Record<string, never>;

  // TODO: write validator for all definitions if keys exist
  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    definitions: {
    [x: string]: string | boolean | number;
  };
}
export class CommandSendXTimes {
  name: 'command-send-x-times';
  triggered: {
    runEveryXCommands: number,
    runInterval: number,
    fadeOutInterval: number,
  };
  definitions: {
    fadeOutXCommands: number,
    fadeOutInterval: number,
    runEveryXCommands: number,
    commandToWatch: string,
    runInterval: number,
  };
}
class KeywordSendXTimes {
  name: 'keyword-send-x-times';
  triggered: {
    runEveryXKeywords: number,
    runInterval: number,
    fadeOutInterval: number,
  };
  definitions: {
    fadeOutXKeywords: number,
    fadeOutInterval: number,
    runEveryXKeywords: number,
    commandToWatch: string,
    runInterval: number,
    resetCountEachMessage: boolean,
  };
}

class NumberOfViewersIsAtLeastX {
  name: 'number-of-viewers-is-at-least-x';
  triggered: {
    runInterval: number,
  };
  definitions: {
    viewersAtLeast: number,
    runInterval: number,
  };
}

class StreamIsRunningXMinutes {
  name: 'stream-is-running-x-minutes';
  triggered: {
    runAfterXMinutes: number,
  };
  definitions: {
    runAfterXMinutes: number,
  };
}

class RewardRedeemed {
  name: 'reward-redeemed';
  triggered: Record<string, never>;
  definitions: {
    rewardId: number,
  };
}

class Raid {
  name: 'reward-redeemed';
  triggered: Record<string, never>;
  definitions: {
    viewersAtLeast: number,
  };
}

class EveryXMinutesOfStream {
  name: 'every-x-minutes-of-stream';
  triggered: {
    runEveryXMinutes: number,
  };
  definitions: {
    runEveryXMinutes: number,
  };
}

@Entity()
export class Event extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column(() => Generic)
    attributes:
  NumberOfViewersIsAtLeastX | StreamIsRunningXMinutes |
  CommandSendXTimes | KeywordSendXTimes | RewardRedeemed | Raid |
  EveryXMinutesOfStream | Generic;

  @Column()
    isEnabled: boolean;

  @Column()
    filter: string;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    operations: Operations[];
}