import { parse } from 'path';

export function getFunctionNameFromStackTrace() {
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_s, s) => s;
  const stack = (new Error().stack as unknown as NodeJS.CallSite[]);
  Error.prepareStackTrace = _prepareStackTrace;
  const path = parse(stack[2].getFunctionName() || '');
  const name = path.name;
  return name;
}