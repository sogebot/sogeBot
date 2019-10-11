declare namespace Types {
  export namespace Timers {
    export type Timer = {
      id: string;
      name: string;
      messages: number;
      seconds: number;
      enabled: boolean;
      trigger: {
        messages: number;
        timestamp: number;
      };
    };

    export type Response = {
      timerId: string;
      timestamp: number;
      enabled: boolean;
      response: string;
    };
  }
}