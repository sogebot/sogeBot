declare namespace Registry {
  namespace Alerts {
    type AnimationIn = 'fade-in' | 'zoom-in';
    type AnimationOut = 'fade-in' | 'zoom-in';
    type AnimationText = 'wiggle';

    export type Alert = {
      id: string;
      name: string,
      alertDelayInMs: number;
      profanityFilterType: 'disabled' | 'replace-with-asterisk' | 'replace-with-happy-words' | 'hide-messages' | 'disable-alerts';
      loadStandardProfanityList: boolean;
      customProfanityList: string[];
      alerts: Follow[]
    }

    export type Follow = {
      enabled: boolean;
      event: 'follow';
      layout: '1' | '2' | '3';
      animationIn: AnimationIn;
      animationOut: AnimationOut;
      animationText: AnimationText;
      messageTemplate: string;
      image: string;
      sound: string;
      soundVolume: number;
      alertDurationInMs: number;
      alertTextDelayInMs: number;
      enableAdvancedMode: boolean;
      font: {
        family: string;
        size: number;
        weight: number;
        color: string;
        highlightcolor: string;
      }
    };
  }
}