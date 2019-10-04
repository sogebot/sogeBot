declare namespace Types {
  export namespace Alias {
    export type Item = {
      _id?: string;
      id: string;
      alias: string;
      command: string;
      enabled: boolean;
      visible: boolean;
      permission: string;
    };
  }
}