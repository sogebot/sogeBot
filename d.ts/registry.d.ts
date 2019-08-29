declare namespace Registry {
  namespace Alerts {
    type AnimationIn
      = 'fadeIn' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight'
      | 'fadeInUp' | 'fadeInDownBig' | 'fadeInLeftBig' | 'fadeInRightBig'
      | 'fadeInUpBig' | 'bounceIn' | 'bounceInDown' | 'bounceInLeft'
      | 'bounceInRight' | 'bounceInUp' | 'flipInX' | 'flipInY' | 'lightSpeedIn'
      | 'rotateIn' | 'rotateInDownLeft' | 'rotateInDownRight' | 'rotateInUpLeft'
      | 'rotateInUpRight' | 'slideInDown' | 'slideInLeft' | 'slideInRight'
      | 'slideInUp' | 'zoomIn' | 'zoomInDown' | 'zoomInLeft' | 'zoomInRight'
      | 'zoomInUp' | 'rollIn' | 'jackInTheBox';
    type AnimationOut
      = 'fadeOut' | 'fadeOutDown' | 'fadeOutLeft' | 'fadeOutRight' | 'fadeOutUp'
      | 'fadeOutDownBig' | 'fadeOutLeftBig' | 'fadeOutRightBig' | 'fadeOutUpBig'
      | 'bounceOut' | 'bounceOutDown' | 'bounceOutLeft' | 'bounceOutRight'
      | 'bounceOutUp' | 'flipOutX' | 'flipOutY' | 'lightSpeedOut' | 'rotateOut'
      | 'rotateOutDownLeft' | 'rotateOutDownRight' | 'rotateOutUpLeft'
      | 'rotateOutUpRight' | 'slideOutDown' | 'slideOutLeft' | 'slideOutRight'
      | 'slideOutUp' | 'zoomOut' | 'zoomOutDown' | 'zoomOutLeft' | 'zoomOutRight'
      | 'zoomOutUp' | 'rollOut';
    type AnimationText
      = 'none' | 'baffle' | 'bounce' | 'bounce2' | 'flip' | 'flash' | 'pulse2' | 'rubberBand'
      | 'shake2' | 'swing' | 'tada' | 'wave' | 'wobble' | 'wiggle' | 'wiggle2' | 'jello';
    type TTS = {
      voice: string;
      pitch: number;
      volume: number;
      rate: number;
    }

    export type Alert = {
      id: string;
      name: string;
      alertDelayInMs: number;
      profanityFilterType: 'disabled' | 'replace-with-asterisk' | 'replace-with-happy-words' | 'hide-messages' | 'disable-alerts';
      loadStandardProfanityList: {
        cs: boolean;
        en: boolean;
        ru: boolean;
      };
      customProfanityList: string;
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
      uuid: string;
      enabled: boolean;
      title: string;
      variantCondition: 'random' | 'exact' | 'gt-eq';
      variantAmount: number;
      messageTemplate: string;
      layout: '1' | '2' | '3' | '4' | '5';
      animationIn: AnimationIn;
      animationOut: AnimationOut;
      animationText: AnimationText;
      animationTextOptions: {
        speed: number | 'slower' | 'slow' | 'fast' | 'faster';
        maxTimeToDecrypt: number;
        characters: string;
      };
      image: string;
      sound: string;
      soundVolume: number;
      alertDurationInMs: number;
      alertTextDelayInMs: number;
      enableAdvancedMode: boolean;
      tts: TTS;
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
    } & CommonSettings;
  }
}