declare namespace Overlay {
  namespace Emotes {
    export interface cache {
      type: 'twitch' | 'bttv' | 'ffz';
      code: string;
      urls: { '1': string; '2': string; '3': string };
    }
  }
}
