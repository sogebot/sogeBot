import { isNil } from 'lodash';
import _ from 'lodash';

import { getOwner } from '../commons';

import {
  Events as EventsEntity,
} from '~/database/entity/event';
import alerts from '~/registries/alerts';

export async function fireCommandRedeem(operation: EventsEntity.OperationDefinitions, attributes: EventsEntity.Attributes) {
  const userName = isNil(attributes.userName) ? getOwner() : attributes.userName;

  alerts.trigger({
    event:      'cmdredeems',
    recipient:  userName,
    name:       String(operation.command),
    amount:     0,
    tier:       null,
    currency:   '',
    monthsName: '',
    message:    '',
  });
}