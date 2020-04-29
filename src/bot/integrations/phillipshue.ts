import chalk from 'chalk';
import _ from 'lodash';
import { HueApi, lightState } from 'node-hue-api';

import { command, default_permission, settings } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { permission } from '../helpers/permissions';
import Integration from './_interface';
import { error, info } from '../helpers/log';
import { translate } from '../translate';

interface State {
  rgb: number[];
  light: number;
  time: number;
  loop: number;
  status: {
    loop: number;
    state: number;
    time: number;
    blocked: boolean;
  };
};

/*
 * NOTE: For this integration to be working, you need bot running on same network, as your lights
 *
 * !hue rgb=<0-255>,<0-255>,<0-255> light=<0-x;default:1> loop=<0-x;default:3> time=<100-x;default:500> - start hue alert
 * !hue list                                                                                            - get lights list
 */

class PhillipsHue extends Integration {
  api: any = null;
  states: State[] = [];

  @settings('connection')
  host = '';
  @settings('connection')
  user = '';
  @settings('connection')
  port = 0;
  @settings('connection')
  timeout = 30000;

  constructor () {
    super();

    setInterval(() => {
      if (!this.enabled) {
        return;
      }
      for (let index = 0, length = this.states.length; index < length; index++) {
        const state = this.states[index];
        if (_.isNil(state) || state.status.blocked) {
          return true;
        }

        if (new Date().getTime() - state.status.time >= state.time) {
          state.status.time = new Date().getTime();

          if (state.status.state === 0) {
            state.status.blocked = true;
            state.status.state = 1;
            this.api.setLightState(state.light, { 'on': true }).done(() => {
              const [r, g, b] = state.rgb;
              this.api.setLightState(state.light, lightState.create().rgb(r, g, b)).done(() => {
                state.status.blocked = false;
                state.status.loop++;
              });
            });
          } else {
            state.status.blocked = true;
            state.status.state = 0;
            this.api.setLightState(state.light, { 'on': false }).fail(function () {
              return true;
            }).done(function () {
              state.status.blocked = false;
              state.status.loop++;
            });
          }
        }

        if (state.status.loop === state.loop * 2) {
          setTimeout(() => {
            this.api.setLightState(state.light, { 'on': false }).fail(function () {
              return true;
            });
          }, state.time + 100);

          this.states.splice(index, 1); // remove from list
        }
      }
    }, 20);
  }

  @onStartup()
  @onChange('enabled')
  onStateChange (key: string, value: boolean) {
    if (value) {
      if (this.host.length === 0 || this.user.length === 0) {
        return;
      }

      this.api = new HueApi(
        this.host,
        this.user,
        this.timeout,
        this.port);

      this.states = [];
      info(chalk.yellow('PHILLIPSHUE: ') + 'Connected to api');
    } else {
      this.api = null;
      info(chalk.yellow('PHILLIPSHUE: ') + 'Not connected to api');
    }
  }

  @command('!hue list')
  @default_permission(permission.CASTERS)
  getLights (opts: CommandOptions): CommandResponse[] {
    try {
      const lights = this.api.lights();
      const output: string[] = [];
      _.each(lights.lights, function (light) {
        output.push('id: ' + light.id + ', name: \'' + light.name + '\'');
      });
      return [{ response: translate('phillipsHue.list') + output.join(' | '), ...opts }];
    } catch (e) {
      error(e.stack);
      return [];
    }
  }


  @command('!hue')
  @default_permission(permission.CASTERS)
  hue (opts: CommandOptions) {
    let rgb = this.parseText(opts.parameters, 'rgb', '255,255,255').split(',').map(o => Number(o));
    if (rgb.length < 3) {
      rgb = [255, 255, 255];
    }

    this.states.push({
      'rgb': rgb,
      'light': Number(this.parseText(opts.parameters, 'light', '1')),
      'time': Number(this.parseText(opts.parameters, 'time', '100')),
      'loop': Number(this.parseText(opts.parameters, 'loop', '3')),
      'status': {
        'loop': 0,
        'state': 0,
        'time': new Date().getTime(),
        'blocked': false,
      },
    });
  }

  parseText (text: string, value: string, defaultValue: string) {
    defaultValue = defaultValue || '0';
    for (const part of text.trim().split(' ')) {
      if (part.startsWith(value + '=')) {
        defaultValue = part.replace(value + '=', '');
        break;
      }
    }
    return defaultValue;
  }
}

export default new PhillipsHue();
