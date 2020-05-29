declare namespace Events {
  export type Event = {
    id: string,
    key: string,
    name: string,
    enabled: boolean,
    triggered: any,
    definitions: Events.OperationDefinitions,
  };

  export type SupportedOperation = {
    id: string,
    definitions: { [x: string]: string | boolean | number | string[] | boolean[] | number[] },
    fire: () => void,
  };

  export type SupportedEvent = {
    id: string,
    definitions: Events.OperationDefinitions,
    variables: string[],
  };

  export type Filter = {
    eventId: string,
    filters: string,
  };

  export type Operation = {
    key: string,
    eventId: string,
    definitions: OperationDefinitions,
  };

  type OperationDefinitions = {
    [x: string]: string | boolean | number;
  };

  type Attributes = {
    userId?: number,
    username?: string,
    reset?: boolean,
    [x: string]: any,
  };
}