declare namespace Types {
  export namespace Cooldown {
    export type Item = {
      _id?: string;
      id: string;
      key: string;
      miliseconds: number;
      type: 'global' | 'user';
      timestamp: number;
      quiet: boolean;
      enabled: boolean;
      owner: boolean;
      moderator: boolean;
      subscriber: boolean;
      follower: boolean;
    };
  }
}