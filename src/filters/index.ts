export * from './command';
export * from './custom';
export * from './evaluate';
export * from './ifp';
export * from './info';
export * from './list';
export * from './math';
export * from './online';
export * from './param';
export * from './price';
export * from './qs';
export * from './random';
export * from './stream';
export * from './youtube';

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