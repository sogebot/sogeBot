import {
  DAY, HOUR, MINUTE, SECOND,
} from '@sogebot/ui-helpers/constants.js';
import {
  defaults, get, isNil,
} from 'lodash-es';
import XRegExp from 'xregexp';

import { debug } from '~/helpers/log.js';
import { ParameterError } from '~/helpers/parameterError.js';

declare global {
  interface RegExpExecArray extends Array<string> {
    [x: string]: any;
    index: number;
    input: string;
  }
}

export class Expects {
  originalText = '';
  text = '';
  match: any[] = [];
  toExec: {fnc: string; opts: any}[] = [];
  isExecuted = false;

  constructor (text?: string) {
    if (text) {
      this.originalText = text;
      this.text = text;
    } else {
      this.originalText = '';
      this.text = '';
    }
    this.match = [];
  }

  exec() {
    for (const ex of this.toExec) {
      (this as any)[ex.fnc]({ ...ex.opts, exec: true });
    }
    this.isExecuted = true;
    return this;
  }

  checkText (opts?: any) {
    opts = opts || {};
    if (isNil(this.text)) {
      throw new ParameterError('Text cannot be null');
    }
    if (this.text.trim().length === 0) {
      if (opts.expects) {
        if (opts.name) {
          throw new ParameterError('Expected parameter <' + get(opts, 'name', '') + ':' + opts.expects + '> at position ' + this.match.length);
        } else {
          throw new ParameterError('Expected parameter <' + opts.expects + '> at position ' + this.match.length);
        }
      } else {
        // generate expected parameters
        const expectedParameters: string[] = [];
        for (const param of this.toExec) {
          switch(param.fnc) {
            case 'command':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + (param.opts.spaces ? '!some command' : '!command')
                + (param.opts.optional ? ']' : ''),
              );
              break;
            case 'points':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `<points|`
                + [
                  (param.opts.all ? 'all' : '' ),
                  (param.opts.negative ? '-100' : '' ),
                  '100',
                ].join(',')
                + '>'
                + (param.opts.optional ? ']' : ''),
              );
              break;
            case 'switch':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `-${param.opts.name} (${param.opts.values.join(', ')})`
                + (param.opts.optional ? ']' : ''),
              );
              break;
            case 'toggler':
              expectedParameters.push(
                `[-${param.opts.name}]`,
              );
              break;
            case 'number':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `<number>`
                + (param.opts.optional ? ']' : ''),
              );
              break;
            case 'string':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `<string>`
                + (param.opts.optional ? ']' : ''),
              );
              break;
            case 'username':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `<username>`
                + (param.opts.optional ? ']' : ''),
              );
              break;
            case 'argument':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `-${param.opts.name} ${param.opts.type.name === 'Number' ? '5' : '"Example string"'}`
                + (param.opts.optional ? ']' : ''),
              );
              break;
            case 'permission':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `-${param.opts.name} b38c5adb-e912-47e3-937a-89fabd12393a`
                + (param.opts.optional ? ']' : ''),
              );
              break;
            case 'list':
              expectedParameters.push(
                `Value1 ${param.opts.delimiter} Another value ${param.opts.delimiter} ...`,
              );
              break;
          }
        }
        throw new ParameterError(expectedParameters.join(' '));
      }
    }
    this.text = this.text.replace(/\s\s+/g, ' ').trim();
  }

  toArray () {
    if (!this.isExecuted) {
      this.exec();
    }
    return this.match;
  }

  command (opts?: any) {
    opts = opts || {};
    defaults(opts, { exec: false, optional: false });
    if (!opts.exec) {
      this.toExec.push({ fnc: 'command', opts });
      return this;
    }
    if (!opts.optional) {
      this.checkText();
    }

    const exclamationMark = opts.canBeWithoutExclamationMark ? '!?' : '!';
    const subCommandRegexp = `(^['"]${exclamationMark}[\\pL0-9 ]*['"])`;
    const commandRegexp = `(^${exclamationMark}[\\pL0-9]*)`;
    const regexp = XRegExp(
      `(?<command> ${[subCommandRegexp, commandRegexp].join('|')})` , 'ix');
    const match = XRegExp.exec(this.text, regexp);
    debug('expects.command', JSON.stringify({
      text: this.text, opts, match,
    }));
    if (match && match.groups) {
      this.match.push(match.groups.command.trim().toLowerCase().replace(/['"]/g, ''));
      this.text = this.text.replace(match.groups.command, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw new ParameterError('Command not found');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  points (opts?: { exec?: boolean, optional?: boolean, all?: boolean, negative?: boolean }) {
    opts = opts || {};
    defaults(opts, {
      exec: false, optional: false, all: false, negative: false,
    });
    if (!opts.exec) {
      this.toExec.push({ fnc: 'points', opts });
      return this;
    }
    if (!opts.optional) {
      this.checkText();
    }

    let regexp;
    if (opts.all) {
      regexp = XRegExp('(?<points> all|-?[0-9]+ )', 'ix');
    } else {
      regexp = XRegExp('(?<points> -?[0-9]+ )', 'ix');
    }
    const match = XRegExp.exec(this.text, regexp);
    if (match && match.groups) {
      if (match.groups.points === 'all') {
        this.match.push(match.groups.points);
      } else {
        const points = Number(match.groups.points);
        this.match.push(
          points <= Number.MAX_SAFE_INTEGER
            ? (opts.negative ? points : Math.abs(points))
            : Number.MAX_SAFE_INTEGER); // return only max safe
      }
      this.text = this.text.replace(match.groups.points, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw new ParameterError('Points not found');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  number (opts?: any) {
    opts = opts || {};
    defaults(opts, {
      exec: false, optional: false, minus: true,
    });
    if (!opts.exec) {
      this.toExec.push({ fnc: 'number', opts });
      return this;
    }
    if (!opts.optional) {
      this.checkText({
        expects: 'number',
        ...opts,
      });
    }

    const regexp = opts.minus ? XRegExp('(?<number> -?[0-9]+ )', 'ix') : XRegExp('(?<number> [0-9]+ )', 'ix');
    const match = XRegExp.exec(this.text, regexp);

    if (match && match.groups) {
      this.match.push(Number(match.groups.number));
      this.text = this.text.replace(match.groups.number, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw new ParameterError('Number not found');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  switch (opts?: any) {
    opts = opts || {};
    defaults(opts, {
      exec: false, optional: false, default: null,
    });
    if (!opts.exec) {
      this.toExec.push({ fnc: 'switch', opts });
      return this;
    }

    if (isNil(opts.name)) {
      throw new ParameterError('Argument name must be defined');
    }
    if (isNil(opts.values)) {
      throw new ParameterError('Values must be defined');
    }
    if (!opts.optional) {
      this.checkText();
    }

    const pattern = opts.values.join('|');

    const regexp = XRegExp(`-(?<${opts.name}>${pattern})`, 'ix');
    const match = XRegExp.exec(this.text, regexp);
    if (match && match.groups && match.groups[opts.name].trim().length !== 0) {
      this.match.push(match.groups[opts.name]);
      this.text = this.text.replace(match[0], ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw new ParameterError('Argument not found');
      } else {
        this.match.push(opts.default);
      }
    }
    return this;
  }

  /* Toggler is used for toggle true/false with argument
   *    !command -c => -c is true
   *    !command => -c is false
   */
  toggler (opts?: any) {
    opts = opts || {};

    if (!opts.exec) {
      this.toExec.push({ fnc: 'toggler', opts });
      return this;
    }

    if (isNil(opts.name)) {
      throw new ParameterError('Toggler name must be defined');
    }

    const regexp = XRegExp(`-${opts.name}\\b`, 'ix');
    const match = XRegExp.exec(this.text, regexp);
    if (match) {
      this.match.push(true);
      this.text = this.text.replace(match[0], ''); // remove from text matched pattern
    } else {
      this.match.push(false);
    }
    return this;
  }

  permission(opts?: {
    exec?: boolean; optional?: boolean; default?: null | string; name?: string
  }) {
    opts = {
      exec:     false,
      optional: false,
      default:  null,
      name:     'p', // default use -p
      ...opts,
    };
    if (!opts.exec) {
      this.toExec.push({ fnc: 'permission', opts });
      return this;
    }
    if (isNil(opts.name)) {
      throw new ParameterError('Permission name must be defined');
    }
    if (opts.optional && opts.default === null) {
      throw new ParameterError('Permission cannot be optional without default value');
    }

    const pattern = `([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})|(?:(?!-[a-zA-Z]).)+`; // capture until -something or [^-]*
    const fullPattern = `-${opts.name}\\s(?<${opts.name}>${pattern})`;
    const regexp = XRegExp(fullPattern, 'ix');
    const match = XRegExp.exec(this.text, regexp);

    debug('expects.permission', JSON.stringify({
      fullPattern, text: this.text, opts, match,
    }));
    if (match && match.groups && match.groups[opts.name].trim().length !== 0) {
      this.match.push(String(match.groups[opts.name].trim()));
      this.text = this.text.replace(match[0], ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw new ParameterError(`Permission ${opts.name} not found`);
      } else {
        this.match.push(opts.default);
      }
    }
    return this;
  }

  argument (opts?: any) {
    opts = opts || {};
    defaults(opts, {
      exec:      false,
      type:      String,
      optional:  false,
      default:   null,
      multi:     false,
      delimiter: '"',
    });
    if (!opts.multi) {
      opts.delimiter = '';
    }
    opts.delimiter = XRegExp.escape(opts.delimiter);

    if (!opts.exec) {
      this.toExec.push({ fnc: 'argument', opts });
      return this;
    }

    if (isNil(opts.name)) {
      throw new ParameterError('Argument name must be defined');
    }
    if (!opts.optional) {
      this.checkText();
    }

    let pattern;
    if (opts.type === 'uuid') {
      pattern = '[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}';
    } else if (opts.type.name === 'Number') {
      pattern = '[0-9]*';
    } else if (opts.type.name === 'Boolean') {
      pattern = 'true|false';
    } else if (opts.type === 'username') {
      pattern = '@?[A-Za-z0-9_]+';
    } else if (!opts.multi) {
      pattern = '\\S+';
    } else {
      pattern = `(?:(?!-[a-zA-Z]).)+${opts.delimiter !== '' ? '?' : ''}`;
    } // capture until -something or [^-]*

    const fullPattern = `-${opts.name}\\s${opts.delimiter}(?<${opts.name}>${pattern})${opts.delimiter}`;
    const regexp = XRegExp(fullPattern, 'ix');
    const match = XRegExp.exec(this.text, regexp);

    debug('expects.argument', JSON.stringify({
      fullPattern, text: this.text, opts, match,
    }));
    if (match && match.groups && match.groups[opts.name].trim().length !== 0) {
      if (opts.type.name === 'Boolean') {
        this.match.push(opts.type(match.groups[opts.name].trim().toLowerCase() === 'true'));
      } else if (['uuid', 'username'].includes(opts.type)) {
        this.match.push(match.groups[opts.name].trim());
      } else {
        this.match.push(opts.type(match.groups[opts.name].trim()));
      }
      this.text = this.text.replace(match[0], ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw new ParameterError(`Argument ${opts.name} not found`);
      } else {
        this.match.push(opts.default);
      }
    }
    return this;
  }

  username (opts?: any) {
    opts = opts || {};
    defaults(opts, {
      exec: false, optional: false, default: null,
    });
    if (!opts.exec) {
      this.toExec.push({ fnc: 'username', opts });
      return this;
    }
    if (!opts.optional) {
      this.checkText();
    }

    const regexp = XRegExp(`@?(?<username>[A-Za-z0-9_]+)`, 'ix');
    const match = XRegExp.exec(`${this.text}`, regexp);
    if (match && match.groups) {
      this.match.push(match.groups.username.toLowerCase());
      this.text = this.text.replace(match.groups.username, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw new ParameterError('Username not found');
      } else {
        this.match.push(opts.default);
      }
    }
    return this;
  }

  everything (opts?: any) {
    opts = opts || {};
    defaults(opts, { exec: false, optional: false });
    if (!opts.exec) {
      this.toExec.push({ fnc: 'everything', opts });
      return this;
    }
    if (!opts.optional) {
      this.checkText({
        expects: opts.name ?? 'any',
        ...opts,
      });
    }

    const regexp = XRegExp(`(?<everything> .* )`, 'ix');
    const match = XRegExp.exec(` ${this.text} `, regexp);
    if (match && match.groups) {
      this.match.push(match.groups.everything.substring(1, match.groups.everything.length - 1).trim());
      this.text = this.text.replace(match.groups.everything, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw new ParameterError('There is no text found.');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  duration ({ optional = false, exec = false }: { optional?: boolean, exec?: boolean }) {
    if (!optional) {
      this.checkText({
        expects: 'duration',
        optional,
      });
    }
    if (!exec) {
      this.toExec.push({ fnc: 'duration', opts: { optional } });
      return this;
    }

    const regexp = XRegExp(`(?<duration> (\\d+(s|m|h|d)) )`, 'igx');
    const match = XRegExp.exec(`${this.text.trim()}`, regexp);
    if (match && match.groups) {
      let value = 0;
      if (match.groups.duration.includes('s')) {
        value = Number(match.groups.duration.replace('s', '')) * SECOND;
      } else if (match.groups.duration.includes('m')) {
        value = Number(match.groups.duration.replace('m', '')) * MINUTE;
      } else if (match.groups.duration.includes('h')) {
        value = Number(match.groups.duration.replace('h', '')) * HOUR;
      } else if (match.groups.duration.includes('d')) {
        value = Number(match.groups.duration.replace('d', '')) * DAY;
      }
      this.match.push(value);
      this.text = this.text.replace(String(value), ''); // remove from text matched pattern
    } else {
      if (!optional) {
        throw new ParameterError('Duration not found');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  oneOf ({ optional = false, values, exec = false, name }: { exec?: boolean, name?: string, optional?: boolean, values: string[] | Readonly<string[]> }) {
    if (!optional) {
      this.checkText({
        expects: 'oneOf',
        optional,
        values,
      });
    }
    if (!exec) {
      this.toExec.push({
        fnc:  'oneOf', opts: {
          optional, values, name,
        },
      });
      return this;
    }

    const regexp = XRegExp(`(?<oneOf> ${values.join('|')} )`, 'igx');
    const match = XRegExp.exec(`${this.text.trim()}`, regexp);
    if (match && match.groups) {
      this.match.push(match.groups.oneOf.trim());
      this.text = this.text.replace(match.groups.oneOf, ''); // remove from text matched pattern
    } else {
      if (!optional) {
        throw new ParameterError('OneOf not found');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  string (opts?: any) {
    opts = opts || {};
    defaults(opts, {
      exec: false, optional: false, additionalChars: '', withSpaces: false,
    });
    if (!opts.exec) {
      this.toExec.push({ fnc: 'string', opts });
      return this;
    }
    if (!opts.optional) {
      this.checkText({
        expects: 'string',
        ...opts,
      });
    }

    const regexp = opts.withSpaces
      ? XRegExp(`(?<string>('[\\S${opts.additionalChars} ]+')|([\\S${opts.additionalChars}]+))`, 'igx')
      : XRegExp(`(?<string>[\\S${opts.additionalChars}]*)`, 'igx');

    const match = XRegExp.exec(`${this.text.trim()}`, regexp);
    if (match && match.groups) {
      this.match.push(match.groups.string.trim());
      this.text = this.text.replace(match.groups.string, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw new ParameterError('String not found');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  list (opts?: any) {
    defaults(opts, {
      exec: false, optional: false, delimiter: ' ',
    });
    if (!opts.exec) {
      this.toExec.push({ fnc: 'list', opts });
      return this;
    }
    this.checkText();

    const regexp = XRegExp('(?<list> .*)', 'ix');
    const match = XRegExp.exec(this.text, regexp);

    if (match && match.groups) {
      this.match.push(match.groups.list.split(opts.delimiter).map((o) => o.trim()));
      this.text = this.text.replace(match.groups.list, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw new ParameterError('List not found');
      } else {
        this.match.push([]);
      }
    }
    return this;
  }
}