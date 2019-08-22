declare namespace Registry {
  namespace Alerts {
    type AnimationIn = 'fade-in' | 'zoom-in';
    type AnimationOut = 'fade-out' | 'zoom-out';
    type AnimationText = 'wiggle';

    export type Alert = {
      id: string;
      name: string;
      alertDelayInMs: number;
      profanityFilterType: 'disabled' | 'replace-with-asterisk' | 'replace-with-happy-words' | 'hide-messages' | 'disable-alerts';
      loadStandardProfanityList: boolean;
      customProfanityList: string[];
      alerts: {
        follows: Follow[];
        hosts: Host[];
        raids: Host[];
        tips: Cheer[];
        cheers: Cheer[];
        subs: Sub[];
      };
    };

    export type CommonSettings = {
      enabled: boolean;
      messageTemplate: string;
      layout: '1' | '2' | '3' | '4' | '5';
      animationIn: AnimationIn; // TBD UI
      animationOut: AnimationOut; // TBD UI
      animationText: AnimationText; // TBD UI
      image: string;
      sound: string;
      soundVolume: number;
      alertDurationInMs: number;
      alertTextDelayInMs: number;
      enableAdvancedMode: boolean;
      // tts TBD
      font: {
        family: string;
        size: number;
        borderPx: number;
        borderColor: string;
        weight: number;
        color: string;
        highlightcolor: string;
      };
    };

    export type Follow = CommonSettings;

    export type Cheer = {
      minAmountToAlert: number;
      message: {
        minAmountToShow: number;
        allowEmotes: {
          twitch: boolean;
          ffz: boolean;
          bttv: boolean;
        };
        font: {
          family: string;
          size: number;
          borderPx: number;
          borderColor: string;
          weight: number;
          color: string;
        };
      };
    } & CommonSettings;

    export type Sub = {
      messageTemplateResub: string;
      message: {
        allowEmotes: {
          twitch: boolean;
          ffz: boolean;
          bttv: boolean;
        };
        font: {
          family: string;
          size: number;
          borderPx: number;
          borderColor: string;
          weight: number;
          color: string;
        };
      };
    } & CommonSettings;

    export type Host = {
      showAutoHost: boolean;
      minViewers: number;
    } & CommonSettings;
  }
}