export * from './command.js';
export * from './count.js';
export * from './custom.js';
export * from './evaluate.js';
export * from './ifp.js';
export * from './info.js';
export * from './list.js';
export * from './math.js';
export * from './online.js';
export * from './param.js';
export * from './price.js';
export * from './qs.js';
export * from './random.js';
export * from './stream.js';
export * from './youtube.js';
export * from './operation.js';

declare function filter (
  message: string,
  attr: {
    [name: string]: any,
    param?: string,
    sender: CommandOptions['sender'],
    'message-type'?: string,
    forceWithoutAt?: boolean
  }
): Promise<any>;

export type ResponseFilter = {
  [x: string]: typeof filter
};