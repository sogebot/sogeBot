import XRegExp from 'xregexp';
import { debug } from './helpers/log';
import { defaults, get, isNil } from 'lodash';

declare global {
  interface RegExpExecArray extends Array<string> {
    [x: string]: any;
    index: number;
    input: string;
  }
}

class Expects {
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
      this[ex.fnc]({...ex.opts, exec: true});
    }
    this.isExecuted = true;
    return this;
  }

  checkText (opts?: any) {
    opts = opts || {};
    if (isNil(this.text)) {
      throw Error('Text cannot be null');
    }
    if (this.text.trim().length === 0) {
      if (opts.expects) {
        if (opts.name) {
          throw Error('Expected parameter <' + get(opts, 'name', '') + ':' + opts.expects + '> at position ' + this.match.length);
        } else {
          throw Error('Expected parameter <' + opts.expects + '> at position ' + this.match.length);
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
                + (param.opts.optional ? ']' : '')
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
                + (param.opts.optional ? ']' : '')
              );
              break;
            case 'switch':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `-${param.opts.name} (${param.opts.values.join(', ')})`
                + (param.opts.optional ? ']' : '')
              );
              break;
            case 'toggler':
              expectedParameters.push(
                `[-${param.opts.name}]`
              );
              break;
            case 'number':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `<number>`
                + (param.opts.optional ? ']' : '')
              );
              break;
            case 'string':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `<string>`
                + (param.opts.optional ? ']' : '')
              );
              break;
            case 'username':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `<username>`
                + (param.opts.optional ? ']' : '')
              );
              break;
            case 'argument':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `-${param.opts.name} ${param.opts.type.name === 'Number' ? '5' : '"Example string"'}`
                + (param.opts.optional ? ']' : '')
              );
              break;
            case 'permission':
              expectedParameters.push(
                (param.opts.optional ? '[' : '')
                + `-${param.opts.name} b38c5adb-e912-47e3-937a-89fabd12393a`
                + (param.opts.optional ? ']' : '')
              );
              break;
            case 'list':
              expectedParameters.push(
                `Value1 ${param.opts.delimiter} Another value ${param.opts.delimiter} ...`
              );
              break;
          }
        }
        throw Error(expectedParameters.join(' '));
      }
    }
    this.text = this.text.replace(/\s\s+/g, ' ').trim();
  }

  check (text) {
    process.stdout.write('Calling deprecated function check(), set in constructor directly\n');
    process.stdout.write(new Error().stack + '\n');
    this.originalText = text;
    this.text = text;
    return this;
  }

  toArray () {
    if (!this.isExecuted) {
      this.exec();
    }
    return this.match;
  }

  command (opts?) {
    opts = opts || {};
    defaults(opts, { exec: false, optional: false, spaces: false });
    if (!opts.exec) {
      this.toExec.push({fnc: 'command', opts});
      return this;
    }
    if (!opts.optional) {
      this.checkText();
    }

    const regexp = XRegExp('(?<command> ^!\\S* )', 'ix');
    const match = XRegExp.exec(this.text, regexp);

    debug('expects.command', JSON.stringify({text: this.text, opts, match}));
    if (!isNil(match)) {
      this.match.push(match.command.trim().toLowerCase());
      this.text = this.text.replace(match.command, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw Error('Command not found');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  points (opts?) {
    opts = opts || {};
    defaults(opts, { exec: false, optional: false, all: false, negative: false });
    if (!opts.exec) {
      this.toExec.push({fnc: 'points', opts});
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
    if (!isNil(match)) {
      if (match.points === 'all') {
        this.match.push(match.points);
      } else {
        this.match.push(parseInt(
          Number(match.points) <= Number.MAX_SAFE_INTEGER
            ? (opts.negative ? match.points : Math.abs(match.points))
            : Number.MAX_SAFE_INTEGER, 10)); // return only max safe
      }
      this.text = this.text.replace(match.points, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw Error('Points not found');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  number (opts?) {
    opts = opts || {};
    defaults(opts, { exec: false, optional: false });
    if (!opts.exec) {
      this.toExec.push({fnc: 'number', opts});
      return this;
    }
    if (!opts.optional) {
      this.checkText({
        expects: 'number',
        ...opts,
      });
    }

    const regexp = XRegExp('(?<number> [0-9]+ )', 'ix');
    const match = XRegExp.exec(this.text, regexp);

    if (!isNil(match)) {
      this.match.push(Number(match.number));
      this.text = this.text.replace(match.number, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw Error('Number not found');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  switch (opts?) {
    opts = opts || {};
    defaults(opts, { exec: false, optional: false, default: null });
    if (!opts.exec) {
      this.toExec.push({fnc: 'switch', opts});
      return this;
    }

    if (isNil(opts.name)) {
      throw Error('Argument name must be defined');
    }
    if (isNil(opts.values)) {
      throw Error('Values must be defined');
    }
    if (!opts.optional) {
      this.checkText();
    }

    const pattern = opts.values.join('|');

    const regexp = XRegExp(`-(?<${opts.name}>${pattern})`, 'ix');
    const match = XRegExp.exec(this.text, regexp);
    if (!isNil(match) && match[opts.name].trim().length !== 0) {
      this.match.push(match[opts.name]);
      this.text = this.text.replace(match[0], ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw Error('Argument not found');
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
  toggler (opts?) {
    opts = opts || {};

    if (!opts.exec) {
      this.toExec.push({fnc: 'toggler', opts});
      return this;
    }

    if (isNil(opts.name)) {
      throw Error('Toggler name must be defined');
    }

    const regexp = XRegExp(`-${opts.name}\\b`, 'ix');
    const match = XRegExp.exec(this.text, regexp);
    if (!isNil(match)) {
      this.match.push(true);
      this.text = this.text.replace(match[0], ''); // remove from text matched pattern
    } else {
      this.match.push(false);
    }
    return this;
  }

  permission(opts?) {
    opts = {
      exec: false,
      optional: false,
      default: null,
      name: 'p', // default use -p
      ...opts,
    };
    if (!opts.exec) {
      this.toExec.push({fnc: 'permission', opts});
      return this;
    }
    if (isNil(opts.name)) {
      throw Error('Permission name must be defined');
    }
    if (opts.optional && opts.default === null) {
      throw Error('Permission cannot be optional without default value');
    }

    const pattern = `([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})|(?:(?!-[a-zA-Z]).)+`; // capture until -something or [^-]*
    const fullPattern = `-${opts.name}\\s(?<${opts.name}>${pattern})`;
    const regexp = XRegExp(fullPattern, 'ix');
    const match = XRegExp.exec(this.text, regexp);

    debug('expects.permission', JSON.stringify({fullPattern, text: this.text, opts, match}));
    if (!isNil(match) && match[opts.name].trim().length !== 0) {
      this.match.push(String(match[opts.name].trim()));
      this.text = this.text.replace(match[0], ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw Error(`Permission ${opts.name} not found`);
      } else {
        this.match.push(opts.default);
      }
    }
    return this;
  }

  argument (opts?) {
    opts = opts || {};
    defaults(opts, {
      exec: false,
      type: String,
      optional: false,
      default: null,
      multi: false,
      delimiter: '"',
    });
    if (!opts.multi) {
      opts.delimiter = '';
    }
    opts.delimiter = XRegExp.escape(opts.delimiter);

    if (!opts.exec) {
      this.toExec.push({fnc: 'argument', opts});
      return this;
    }

    if (isNil(opts.name)) {
      throw Error('Argument name must be defined');
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
    } else if (!opts.multi) {
      pattern = '\\S+';
    } else {
      pattern = `(?:(?!-[a-zA-Z]).)+${opts.delimiter !== '' ? '?' : ''}`;
    } // capture until -something or [^-]*

    const fullPattern = `-${opts.name}\\s${opts.delimiter}(?<${opts.name}>${pattern})${opts.delimiter}`;
    const regexp = XRegExp(fullPattern, 'ix');
    const match = XRegExp.exec(this.text, regexp);

    debug('expects.argument', JSON.stringify({fullPattern, text: this.text, opts, match}));
    if (!isNil(match) && match[opts.name].trim().length !== 0) {
      if (opts.type.name === 'Boolean') {
        this.match.push(opts.type(match[opts.name].trim().toLowerCase() === 'true'));
      } else if (opts.type === 'uuid') {
        this.match.push(match[opts.name].trim());
      } else {
        this.match.push(opts.type(match[opts.name].trim()));
      }
      this.text = this.text.replace(match[0], ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw Error(`Argument ${opts.name} not found`);
      } else {
        this.match.push(opts.default);
      }
    }
    return this;
  }

  username (opts?) {
    opts = opts || {};
    defaults(opts, { exec: false, optional: false, default: null });
    if (!opts.exec) {
      this.toExec.push({fnc: 'username', opts});
      return this;
    }
    if (!opts.optional) {
      this.checkText();
    }

    const regexp = XRegExp(`@?(?<username>[A-Za-z0-9_]+)`, 'ix');
    const match = XRegExp.exec(`${this.text}`, regexp);
    if (!isNil(match)) {
      this.match.push(match.username.toLowerCase());
      this.text = this.text.replace(match.username, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw Error('Username not found');
      } else {
        this.match.push(opts.default);
      }
    }
    return this;
  }

  everything (opts?) {
    opts = opts || {};
    defaults(opts, { exec: false, optional: false });
    if (!opts.exec) {
      this.toExec.push({fnc: 'everything', opts});
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
    if (!isNil(match)) {
      this.match.push(match.everything.substring(1, match.everything.length - 1).trim());
      this.text = this.text.replace(match.everything, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw Error('There is no text found.');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  string (opts?) {
    opts = opts || {};
    defaults(opts, { exec: false, optional: false });
    if (!opts.exec) {
      this.toExec.push({fnc: 'string', opts});
      return this;
    }
    if (!opts.optional) {
      this.checkText({
        expects: 'string',
        ...opts,
      });
    }

    const regexp = XRegExp(`(?<string> \\S* )`, 'igx');
    const match = XRegExp.exec(`${this.text.trim()}`, regexp);
    if (!isNil(match)) {
      this.match.push(match.string.trim());
      this.text = this.text.replace(match.string, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw Error('String not found');
      } else {
        this.match.push(null);
      }
    }
    return this;
  }

  list (opts?) {
    defaults(opts, { exec: false, optional: false, delimiter: ' ' });
    if (!opts.exec) {
      this.toExec.push({fnc: 'list', opts});
      return this;
    }
    this.checkText();

    const regexp = XRegExp('(?<list> .*)', 'ix');
    const match = XRegExp.exec(this.text, regexp);

    if (!isNil(match)) {
      this.match.push(match.list.split(opts.delimiter).map((o) => o.trim()));
      this.text = this.text.replace(match.list, ''); // remove from text matched pattern
    } else {
      if (!opts.optional) {
        throw Error('List not found');
      } else {
        this.match.push([]);
      }
    }
    return this;
  }
}

module.exports = Expects;
export default Expects;
