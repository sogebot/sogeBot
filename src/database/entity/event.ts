import { Column, PrimaryColumn, Entity } from 'typeorm';
import { z } from 'zod';

import { BotEntity } from '../BotEntity.js';
import { command } from '../validators/IsCommand.js';
import { customvariable } from '../validators/isCustomVariable.js';

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

class Definitions {
  fadeOutXCommands?: number;
  fadeOutXKeywords?: number;
  fadeOutInterval?: number;
  runEveryXCommands?: number;
  runEveryXKeywords?: number;
  commandToWatch?: string;
  keywordToWatch?: string;
  runInterval?: number;
  rewardId?: string;
  viewersAtLeast?: number;
  runAfterXMinutes?: number;
  runEveryXMinutes?: number;
  resetCountEachMessage?: boolean;
}

export class Generic {
  @Column({ type: 'text' })
    name: string;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    triggered: Record<string, never>;

  // TODO: write validator for all definitions if keys exist
  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    definitions: Definitions;
}
export class CommandSendXTimes {
  name: 'command-send-x-times';
  triggered: {
    runEveryXCommands?: number,
    runInterval?: number,
    fadeOutInterval?: number,
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
    runEveryXKeywords?: number,
    runInterval?: number,
    fadeOutInterval?: number,
  };
  definitions: {
    fadeOutXKeywords: number,
    fadeOutInterval: number,
    runEveryXKeywords: number,
    keywordToWatch: string,
    runInterval: number,
    resetCountEachMessage: boolean,
  };
}

class NumberOfViewersIsAtLeastX {
  name: 'number-of-viewers-is-at-least-x';
  triggered: {
    runInterval?: number,
  };
  definitions: {
    viewersAtLeast: number,
    runInterval: number,
  };
}

class StreamIsRunningXMinutes {
  name: 'stream-is-running-x-minutes';
  triggered: {
    runAfterXMinutes?: number,
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
  name: 'raid';
  triggered: Record<string, never>;
  definitions: {
    viewersAtLeast: number,
  };
}

class EveryXMinutesOfStream {
  name: 'every-x-minutes-of-stream';
  triggered: {
    runEveryXMinutes?: number,
  };
  definitions: {
    runEveryXMinutes: number,
  };
}

@Entity()
export class Event extends BotEntity {
  schema = z.object({
    event: z.discriminatedUnion('name', [
      z.object({
        name:        z.literal('number-of-viewers-is-at-least-x'),
        triggered:   z.object({}),
        definitions: z.object({
          viewersAtLeast: z.number().int().min(0),
          runInterval:    z.number().int().min(0),
        }),
      }),
      z.object({
        name:        z.literal('stream-is-running-x-minutes'),
        triggered:   z.object({}),
        definitions: z.object({
          runAfterXMinutes: z.number().int().min(0),
        }),
      }),
      z.object({
        name:        z.literal('reward-redeemed'),
        triggered:   z.object({}),
        definitions: z.object({
          rewardId: z.custom((val) => typeof val === 'string' && val.length > 0, 'isNotEmpty'),
        }),
      }),
      z.object({
        name:        z.literal('command-send-x-times'),
        triggered:   z.object({}),
        definitions: z.object({
          fadeOutXCommands:  z.number().int().min(0),
          fadeOutInterval:   z.number().int().min(1),
          runEveryXCommands: z.number().int().min(0),
          commandToWatch:    command(),
          runInterval:       z.number().int().min(0),
        }),
      }),
      z.object({
        name:        z.literal('keyword-send-x-times'),
        triggered:   z.object({}),
        definitions: z.object({
          fadeOutXKeywords:      z.number().int().min(0),
          fadeOutInterval:       z.number().int().min(1),
          runEveryXKeywords:     z.number().int().min(0),
          keywordToWatch:        z.string().trim().min(2),
          runInterval:           z.number().int().min(0),
          resetCountEachMessage: z.boolean(),
        }),
      }),
      z.object({
        name:        z.literal('raid'),
        triggered:   z.object({}),
        definitions: z.object({
          viewersAtLeast: z.number().int().min(0),
        }),
      }),
      z.object({
        name:        z.literal('every-x-minutes-of-stream'),
        triggered:   z.object({}),
        definitions: z.object({
          runEveryXMinutes: z.number().int().min(1),
        }),
      }),
      ...[
        'prediction-started', 'prediction-locked', 'prediction-ended',
        'poll-started', 'poll-ended',
        'hypetrain-started', 'hypetrain-ended', 'hypetrain-level-reached',
        'user-joined-channel', 'user-parted-channel',
        'mod', 'commercial', 'timeout',
        'action', 'clearchat', 'stream-started', 'stream-stopped',
        'ban', 'cheer', 'game-changed', 'follow', 'subscription', 'subgift',
        'subcommunitygift', 'resub', 'tip',
      ].map(defaultEventValidationSchema),
    ]),
    operations: z.array(z.discriminatedUnion('name', [
      z.object({
        name:        z.literal('run-obswebsocket-command'),
        definitions: z.object({
          taskId: z.custom((val) => typeof val === 'string' && val.length > 0, 'isNotEmpty'),
        }),
      }),
      z.object({
        name:        z.literal('send-discord-message'),
        definitions: z.object({
          channel:       z.string().trim().min(1),
          messageToSend: z.string().trim().min(1),
        }),
      }),
      z.object({
        name:        z.literal('send-chat-message'),
        definitions: z.object({
          messageToSend: z.string().trim().min(1),
        }),
      }),
      z.object({
        name:        z.literal('send-whisper'),
        definitions: z.object({
          messageToSend: z.string().trim().min(1),
        }),
      }),
      z.object({
        name:        z.literal('run-command'),
        definitions: z.object({
          commandToRun: command(),
        }),
      }),
      z.object({
        name:        z.literal('emote-explosion'),
        definitions: z.object({
          emotesToExplode: z.string().trim().min(1),
        }),
      }),
      z.object({
        name:        z.literal('emote-firework'),
        definitions: z.object({
          emotesToFirework: z.string().trim().min(1),
        }),
      }),
      z.object({
        name:        z.literal('increment-custom-variable'),
        definitions: z.object({
          customVariable:    customvariable(),
          numberToIncrement: z.number().min(0),
        }),
      }),
      z.object({
        name:        z.literal('set-custom-variable'),
        definitions: z.object({
          customVariable: customvariable(),
        }),
      }),
      z.object({
        name:        z.literal('decrement-custom-variable'),
        definitions: z.object({
          customVariable:    customvariable(),
          numberToDecrement: z.number().min(0),
        }),
      }),
      ...[
        'bot-will-join-channel', 'bot-will-part-channel', 'create-a-clip', 'start-commercial',
      ].map((name) => z.object({
        name: z.literal(name),
      })),
    ])),
  });
  
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column(() => Generic)
    event:
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

const defaultEventValidationSchema = (key: string) => z.object({
  name:        z.literal(key),
  triggered:   z.object({}),
  definitions: z.object({}),
});