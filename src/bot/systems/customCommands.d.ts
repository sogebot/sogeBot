export interface Response {
  cid: string;
  order: number;
  response: string;
  stopIfExecuted: boolean;
  permission: string;
  filter: string;
};

export interface Command {
  id: string;
  command: string;
  enabled: boolean;
  visible: boolean;
  count: number;
};