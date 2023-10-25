import { isNil, isObject } from 'lodash-es';
import _ from 'lodash-es';
import { v4 } from 'uuid';

import { getOwner, getUserSender } from '../commons/index.js';

import { parserReply } from '~/commons.js';
import {
  Events as EventsEntity,
} from '~/database/entity/event.js';
import { debug } from '~/helpers/log.js';
import { parserEmitter } from '~/helpers/parser/index.js';
import { Message } from  '~/message.js';
import users from '~/users.js';

type data = {
  command: string; userName: string, userId: string, timeout: number; isCommandQuiet: boolean,
};

const commandsToRun = new Map<string, data>();

export async function fireRunCommand(operation: EventsEntity.OperationDefinitions, attributes: EventsEntity.Attributes) {
  const userName = isNil(attributes.userName) ? getOwner() : attributes.userName;
  const userId = attributes.userId ? attributes.userId : await users.getIdByName(userName);
  operation.timeout ??= 0;
  operation.timeoutType ??= 'normal';
  operation.isCommandQuiet ??= false;

  let command = String(operation.commandToRun);
  for (const key of Object.keys(attributes).sort((a, b) => a.length - b.length)) {
    const val = attributes[key];
    if (isObject(val) && Object.keys(val).length === 0) {
      return;
    } // skip empty object
    const replace = new RegExp(`\\$${key}`, 'gi');
    command = command.replace(replace, val);
  }

  if (operation.timeoutType === 'normal') {
    debug('events.runCommand', `Adding new command to queue`);
    // each event command will be triggered
    commandsToRun.set(v4(), {
      userName, userId, command, timeout: Date.now() + Number(operation.timeout), isCommandQuiet: operation.isCommandQuiet as boolean,
    });
  } else {
    const originalCommand = commandsToRun.get(attributes.eventId);
    if (operation.timeoutType === 'add') {
      debug('events.runCommand', `Adding timeout for ${attributes.eventId}`);
      const startTime = originalCommand?.timeout ?? Date.now();
      commandsToRun.set(attributes.eventId, {
        userName, userId, command, timeout: startTime + Number(operation.timeout), isCommandQuiet: operation.isCommandQuiet as boolean,
      });
    } else if (operation.timeoutType === 'reset') {
      debug('events.runCommand', `Reseting timeout for ${attributes.eventId}`);
      commandsToRun.set(attributes.eventId, {
        userName, userId, command, timeout: Date.now() + Number(operation.timeout), isCommandQuiet: operation.isCommandQuiet as boolean,
      });
    }
  }
}

setInterval(async () => {
  for (const [eventId, data] of commandsToRun.entries()) {
    debug('events.runCommand', `Checking ${eventId}, Time to run '${Date.now() - data.timeout}'`);
    if (Date.now() - data.timeout > 0) {
      debug('events.runCommand', `Triggering ${eventId}, running '${data.command}'`);
      commandsToRun.delete(eventId);

      const command = await new Message(data.command).parse({ userName: data.userName, sender: getUserSender(String(data.userId), data.userName), discord: undefined });

      parserEmitter.emit('process', {
        sender:  { userName: data.userName, userId: String(data.userId) },
        message: command,
        skip:    true,
        quiet:   data.isCommandQuiet,
      }, (responses) => {
        for (let i = 0; i < responses.length; i++) {
          setTimeout(async () => {
            parserReply(await responses[i].response, { sender: responses[i].sender, discord: responses[i].discord, attr: responses[i].attr, id: '' });
          }, 500 * i);
        }
      });
    }
  }
}, 100);