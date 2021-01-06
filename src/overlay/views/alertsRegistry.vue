<template>
  <div>
    <div v-if="urlParam('debug')" class="debug">
      <json-viewer :value="{data}" boxed copyable :expand-depth="2"></json-viewer>
      <json-viewer :value="{runningAlert}" boxed copyable :expand-depth="2"></json-viewer>
    </div>
    <template v-if="state.loaded === $state.success">
      <div v-if="runningAlert">
        <audio ref="audio" v-if="typeOfMedia.get(runningAlert.alert.soundId) === 'audio'">
          <source :src="'/registry/alerts/' + runningAlert.alert.soundId">
        </audio>
        <div v-if="runningAlert.isShowing"
          :class="{
            center: !runningAlert.alert.enableAdvancedMode,
            ['layout-' + runningAlert.alert.layout]: true,
          }">
          <template v-if="!runningAlert.alert.enableAdvancedMode">
            <video ref="video" v-if="typeOfMedia.get(runningAlert.alert.imageId) === 'video'" style="max-width:500px;" :class="{ center: runningAlert.alert.layout === '3', ['animate__' + runningAlert.animation]: true }" class="animate__animated w-100 pb-3"
              :style="{
                'transform': 'scale(' + runningAlert.alert.imageOptions.scale / 100 +') translate(' + runningAlert.alert.imageOptions.translateX +'px, ' + runningAlert.alert.imageOptions.translateY +'px)',
                'animation-duration': runningAlert.animationSpeed + 'ms',
              }
            ">
              <source :src="'/registry/alerts/' + runningAlert.alert.imageId" type="video/webm">
              Your browser does not support the video tag.
            </video>
            <img v-else-if="showImage" @error="showImage=false" :src="'/registry/alerts/' + runningAlert.alert.imageId" :class="{ center: runningAlert.alert.layout === '3', ['animate__' + runningAlert.animation]: true }" class="animate__animated"
              :style="{
                'transform': 'scale(' + runningAlert.alert.imageOptions.scale / 100 +') translate(' + runningAlert.alert.imageOptions.translateX +'px, ' + runningAlert.alert.imageOptions.translateY +'px)',
                'animation-duration': runningAlert.animationSpeed + 'ms',
              }"/>
            <div
              v-if="runningAlert.isShowingText"
              :class="{
                center: runningAlert.alert.layout === '3',
                ['animate__' + runningAlert.animation]: true,
              }"
              :style="{'text-align': runningAlert.alert.font.align, 'animation-duration': runningAlert.animationSpeed + 'ms'}"
              class="animate__animated">
                <span :style="{
                  'font-family': runningAlert.alert.font.family,
                  'font-size': runningAlert.alert.font.size + 'px',
                  'font-weight': runningAlert.alert.font.weight,
                  'color': runningAlert.alert.font.color,
                  'text-shadow': [textStrokeGenerator(runningAlert.alert.font.borderPx, runningAlert.alert.font.borderColor), shadowGenerator(runningAlert.alert.font.shadow)].filter(Boolean).join(', ')
                  }">
                  <v-runtime-template :template="prepareMessageTemplate(runningAlert.alert.messageTemplate)"></v-runtime-template>
                </span>
                <div
                  v-if="
                      typeof runningAlert.alert.message !== 'undefined'
                    && typeof runningAlert.alert.message.minAmountToShow !== 'undefined'
                    && runningAlert.alert.message.minAmountToShow <= runningAlert.amount"
                  :class="{
                  }"
                  :style="{
                    'width': '30rem',
                    'text-align': runningAlert.alert.message.font.align,
                    'flex': '1 0 0px',
                    'font-family': runningAlert.alert.message.font.family,
                    'font-size': runningAlert.alert.message.font.size + 'px',
                    'font-weight': runningAlert.alert.message.font.weight,
                    'color': runningAlert.alert.message.font.color,
                    'text-shadow': textStrokeGenerator(runningAlert.alert.message.font.borderPx, runningAlert.alert.message.font.borderColor)
                  }" v-html="withEmotes(runningAlert.message)">
                </div>
            </div>
             <!-- we need to have hidden div to have proper width -->
            <div v-else
              :style="{
                'visibility': 'hidden',
              }">
                <span :style="{
                  'font-family': runningAlert.alert.font.family,
                  'font-size': runningAlert.alert.font.size + 'px',
                  'font-weight': runningAlert.alert.font.weight,
                  'color': runningAlert.alert.font.color,
                  'text-shadow': [textStrokeGenerator(runningAlert.alert.font.borderPx, runningAlert.alert.font.borderColor), shadowGenerator(runningAlert.alert.font.shadow)].filter(Boolean).join(', ')
                  }">
                  <v-runtime-template :template="prepareMessageTemplate(runningAlert.alert.messageTemplate)"></v-runtime-template>
                </span>
                <div
                  v-if="
                      typeof runningAlert.alert.message !== 'undefined'
                    && typeof runningAlert.alert.message.minAmountToShow !== 'undefined'
                    && runningAlert.alert.message.minAmountToShow <= runningAlert.amount"
                  :class="{
                  }"
                  :style="{
                    'width': '30rem',
                    'text-align': runningAlert.alert.message.font.align,
                    'flex': '1 0 0px',
                    'font-family': runningAlert.alert.message.font.family,
                    'font-size': runningAlert.alert.message.font.size + 'px',
                    'font-weight': runningAlert.alert.message.font.weight,
                    'color': runningAlert.alert.message.font.color,
                    'text-shadow': textStrokeGenerator(runningAlert.alert.message.font.borderPx, runningAlert.alert.message.font.borderColor)
                  }" v-html="withEmotes(runningAlert.message)">
                </div>
            </div>
            <!-- empty div to mitigate text area -->
          </template>
          <v-runtime-template
            v-else
            :template="preparedAdvancedHTML">
          </v-runtime-template>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import JsonViewer from 'vue-json-viewer'
import VRuntimeTemplate from 'v-runtime-template';
import { isEqual, get } from 'lodash-es';
import urlRegex from 'url-regex';

import { CacheEmotesInterface } from 'src/bot/database/entity/cacheEmotes';
import { EmitData, AlertInterface, CommonSettingsInterface, AlertTipInterface, AlertResubInterface, AlertRewardRedeemInterface } from 'src/bot/database/entity/alert';

import { getSocket } from 'src/panel/helpers/socket';
import { textStrokeGenerator, shadowGenerator } from 'src/panel/helpers/text';

require('../../../scss/letter-animations.css');
require('animate.css');

declare global {
  interface Window {
    responsiveVoice: any;
  }
}
let isTTSPlaying = false;
let cleanupAlert = false;

let alerts: EmitData[] = [];

@Component({
  components: {
    JsonViewer,
    VRuntimeTemplate,
    'baffle': () => import('src/panel/components/baffle.vue'),
  }
})
export default class AlertsRegistryOverlays extends Vue {
  textStrokeGenerator = textStrokeGenerator;
  shadowGenerator = shadowGenerator;

  socket = getSocket('/registries/alerts', true);
  socketEmotes = getSocket('/overlays/emotes', true);
  socketRV = getSocket('/integrations/responsivevoice', true);
  interval: number[] = [];
  loadedFonts: string[] = [];
  loadedCSS: string[] = [];
  responsiveAPIKey: string | null = null;

  preparedAdvancedHTML: string = '';
  typeOfMedia: Map<string, 'audio' | 'image' | 'video' | null> = new Map();

  state: {
    loaded: number,
  } = {
    loaded: this.$state.progress,
  }

  id: null | string = null;
  updatedAt: number = -1; // force initial load
  data: null | AlertInterface = null;
  defaultProfanityList: string[] = [];
  listHappyWords: string[] = [];
  emotes: CacheEmotesInterface[] = [];
  showImage = true;

  runningAlert: EmitData & {
    animation: string;
    animationSpeed: number;
    animationText: string;
    isShowingText: boolean;
    isShowing: boolean;
    soundPlayed: boolean;
    hideAt: number;
    showTextAt: number;
    showAt: number;
    waitingForTTS: boolean;
    alert: CommonSettingsInterface | AlertTipInterface | AlertResubInterface;
  } | null = null;

  beforeDestroyed() {
    for (const interval of this.interval) {
      clearInterval(interval);
    }
  }

  withEmotes(text: string) {
    // checking emotes
    for (let emote of this.emotes) {
      if (get(this.runningAlert, `alert.message.allowEmotes.${emote.type}`, false)) {
        const split = text.split(' ');
        for (let i = 0; i < split.length; i++) {
          if (split[i] === emote.code) {
            split[i] = `<img src='${emote.urls[1]}' style='position: relative; top: 0.1rem;'/>`;
          }
        }
        text = split.join(' ');
      }
    }
    return text;
  }

  animationTextClass() {
    if (this.runningAlert && this.runningAlert.showTextAt <= Date.now()) {
      return this.runningAlert.hideAt - Date.now() <= 0
        && (!isTTSPlaying || !this.runningAlert.alert.tts.keepAlertShown)
        && !this.runningAlert.waitingForTTS
        ? this.runningAlert.alert.animationOut
        : this.runningAlert.alert.animationIn;
    } else {
      return 'none';
    }
  }

  animationSpeed() {
    if (this.runningAlert) {
      return this.runningAlert.hideAt - Date.now() <= 0
        && (!isTTSPlaying || !this.runningAlert.alert.tts.keepAlertShown)
        && !this.runningAlert.waitingForTTS
        ? this.runningAlert.alert.animationOutDuration
        : this.runningAlert.alert.animationInDuration;
    } else {
      return 1000;
    }
  }

  animationClass() {
    if (this.runningAlert) {
      return this.runningAlert.hideAt - Date.now() <= 0
        && (!isTTSPlaying || !this.runningAlert.alert.tts.keepAlertShown)
        && !this.runningAlert.waitingForTTS
        ? this.runningAlert.alert.animationOut
        : this.runningAlert.alert.animationIn;
    } else {
      return 'none';
    }
  }

  async speak(text: string, voice: string, rate: number, pitch: number, volume: number) {
    isTTSPlaying = true;
    for (const TTS of text.split('/ ')) {
      await new Promise<void>(resolve => {
        if (TTS.trim().length === 0) {
          setTimeout(() => resolve(), 500);
        } else {
          console.log({rate, pitch, volume});
          window.responsiveVoice.speak(TTS, voice, { rate, pitch, volume, onend: () => setTimeout(() => resolve(), 500) });
        }
      });
    }
    isTTSPlaying = false;
  }

  initResponsiveVoice() {
    if (typeof window.responsiveVoice === 'undefined') {
      setTimeout(() => this.initResponsiveVoice(), 200);
      return;
    }
    window.responsiveVoice.init();
    console.debug('= ResponsiveVoice init OK')
  }

  checkResponsiveVoiceAPIKey() {
    this.socketRV.emit('get.value', 'key', (err: string | null, value: string) => {
      if (this.responsiveAPIKey !== value) {
        // unload if values doesn't match
        this.$unloadScript("https://code.responsivevoice.org/responsivevoice.js?key=" + this.responsiveAPIKey)
          .catch(() => {}); // skip error
        if (value.trim().length > 0) {
          this.$loadScript("https://code.responsivevoice.org/responsivevoice.js?key=" + value)
            .then(() => {
              this.responsiveAPIKey = value;
              this.initResponsiveVoice();
              setTimeout(() => this.checkResponsiveVoiceAPIKey(), 1000);
            });
        } else {
          console.debug('TTS disabled, responsiveVoice key is not set')
          this.responsiveAPIKey = value;
          setTimeout(() => this.checkResponsiveVoiceAPIKey(), 1000);
        }
      }
      setTimeout(() => this.checkResponsiveVoiceAPIKey(), 1000);
    })
  }

  mounted() {
    this.checkResponsiveVoiceAPIKey();
    this.interval.push(window.setInterval(() => {
      if (this.runningAlert) {
        this.runningAlert.animation = this.animationClass();
        this.runningAlert.animationSpeed = this.animationSpeed();
        this.runningAlert.animationText = this.animationTextClass();

        // cleanup alert after 5s and if responsiveVoice is done
        if (this.runningAlert.hideAt - Date.now() <= 0
          && !isTTSPlaying
          && !this.runningAlert.waitingForTTS) {
            if (!cleanupAlert) {
            console.debug('Cleanin up', { isTTSPlaying, waitingForTTS: this.runningAlert.waitingForTTS, hideAt: this.runningAlert.hideAt - Date.now() <= 0 })
            // eval onEnded
            this.$nextTick(() => {
              if (this.runningAlert && this.runningAlert.alert.enableAdvancedMode) {
                eval(`${this.runningAlert.alert.advancedMode.js}; if (typeof onEnded === 'function') { onEnded() } else { console.log('no onEnded() function found'); }`);
              }
            })

            cleanupAlert = true;
            setTimeout(() => {
              this.runningAlert = null;
              cleanupAlert = false;
            }, this.runningAlert.alert.animationOutDuration + 1000)
          }
          return;
        } else {
          cleanupAlert = false;
        }

        if (this.runningAlert.showAt <= Date.now() && !this.runningAlert.isShowing) {
          console.debug('showing image');
          this.runningAlert.isShowing = true;

          this.$nextTick(() => {
            if (this.$refs.video && this.runningAlert) {
              (this.$refs.video as HTMLMediaElement).volume = this.runningAlert.alert.soundVolume / 100;
              (this.$refs.video as HTMLMediaElement).play();
            }
          })
        }

        if (this.runningAlert.showTextAt <= Date.now() && !this.runningAlert.isShowingText) {
          console.debug('showing text');
          this.runningAlert.isShowingText = true;
        }

        if (this.runningAlert.waitingForTTS && (this.typeOfMedia.get(this.runningAlert.alert.soundId) === null || (this.$refs.audio as HTMLMediaElement).ended)) {
          let message = this.runningAlert.message;
          if (this.runningAlert.alert.tts.skipUrls) {
            for (const match of message.match(urlRegex({strict: false})) ?? []) {
              message = message.replace(match, '');
            }
          }
          this.speak(message, this.runningAlert.alert.tts.voice, this.runningAlert.alert.tts.rate, this.runningAlert.alert.tts.pitch, this.runningAlert.alert.tts.volume)
          this.runningAlert.waitingForTTS = false;
        }

        if (this.runningAlert.showAt <= Date.now() && !this.runningAlert.soundPlayed) {
          console.debug('playing audio');
          if (this.typeOfMedia.get(this.runningAlert.alert.soundId) !== null) {
            (this.$refs.audio as HTMLMediaElement).volume = this.runningAlert.alert.soundVolume / 100;
            (this.$refs.audio as HTMLMediaElement).play();
          }
          this.runningAlert.soundPlayed = true;
        }
      }

      if (this.runningAlert === null && alerts.length > 0) {
        this.showImage = true;
        const emitData = alerts.shift()
        if (emitData && this.data) {
          let possibleAlerts = this.data[emitData.event];

          // select only correct triggered events
          if (emitData.event === 'rewardredeems') {
            possibleAlerts = (possibleAlerts as AlertRewardRedeemInterface[]).filter(o => o.rewardId === emitData.name)
          }
          if (possibleAlerts.length > 0) {
            // search for exact variants
            const possibleAlertsWithExactAmount = possibleAlerts.filter(o => {
              return o.enabled
                  && o.variantCondition === 'exact'
                  && o.variantAmount === emitData.amount;
            });

            // search for gt-eq variants
            const possibleAlertsWithGtEqAmount = possibleAlerts.filter(o => {
              return o.enabled
                  && o.variantCondition === 'gt-eq'
                  && o.variantAmount <= emitData.amount
            });

            // search for tier-gt-eq variants
            const possibleAlertsWithTierExactAmount = possibleAlerts.filter(o => {
              return o.enabled
                  && o.variantCondition === 'tier-exact'
                  && emitData.tier
                  && (o.variantAmount === 0 ? 'Prime' : String(o.variantAmount)) === emitData.tier
            });

            // search for tier-gt-eq variants
            const possibleAlertsWithTierGtEqAmount = possibleAlerts.filter(o => {
              const tiers = ['Prime', '1', '2', '3'];
              const tier = (o.variantAmount === 0 ? 'Prime' : String(o.variantAmount));
              const idx = tiers.findIndex((o) => o === tier);
              const usable = tiers.slice(idx, tiers.length);
              console.log({
                tiers,
                tier,
                usable,
                idx,
              });

              return o.enabled
                  && o.variantCondition === 'tier-gt-eq'
                  && emitData.tier
                  && usable.includes(emitData.tier)
            });

            // search for random variants
            let possibleAlertsWithRandomCount: (CommonSettingsInterface | AlertTipInterface | AlertResubInterface)[] = [];
            for (const alert of possibleAlerts) {
              if (!alert.enabled) {
                continue;
              }

              if (alert.variantCondition === 'random') {
                for (let i = 0; i < alert.variantAmount; i++) {
                  possibleAlertsWithRandomCount.push(alert)
                }
              }
            }

            console.debug({emitData, possibleAlerts, possibleAlertsWithRandomCount, possibleAlertsWithExactAmount, possibleAlertsWithGtEqAmount, possibleAlertsWithTierExactAmount, possibleAlertsWithTierGtEqAmount})

            let alert: CommonSettingsInterface | AlertTipInterface | AlertResubInterface | undefined;
            if (possibleAlertsWithExactAmount.length > 0) {
              alert = possibleAlertsWithExactAmount[Math.floor(Math.random() * possibleAlertsWithExactAmount.length)];
            } else if (possibleAlertsWithGtEqAmount.length > 0) {
              alert = possibleAlertsWithGtEqAmount[Math.floor(Math.random() * possibleAlertsWithGtEqAmount.length)];
            } else if (possibleAlertsWithTierExactAmount.length > 0) {
              alert = possibleAlertsWithTierExactAmount[Math.floor(Math.random() * possibleAlertsWithTierExactAmount.length)];
            } else if (possibleAlertsWithTierGtEqAmount.length > 0) {
              alert = possibleAlertsWithTierGtEqAmount[Math.floor(Math.random() * possibleAlertsWithTierGtEqAmount.length)];
            } else {
              alert = possibleAlertsWithRandomCount[Math.floor(Math.random() * possibleAlertsWithRandomCount.length)];
            }
            if (!alert || !alert.id) {
              console.log('No alert found or all are disabled');
              return;
            }

            // advancedMode
            if (alert.enableAdvancedMode) {
              // prepare HTML
              this.preparedAdvancedHTML = alert.advancedMode.html || '';

              // load ref="text" class
              const refTextClassMatch = /\<div.*class="(.*?)".*ref="text"\>|\<div.*ref="text".*class="(.*?)"\>/gm.exec(this.preparedAdvancedHTML);
              let refTextClass = '';
              if (refTextClassMatch) {
                if (refTextClassMatch[1]) {
                  refTextClass = refTextClassMatch[1];
                }
                if (refTextClassMatch[2]) {
                  refTextClass = refTextClassMatch[2];
                }
              }

              // load ref="image" class
              const refImageClassMatch = /\<div.*class="(.*?)".*ref="image"\>|\<div.*ref="image".*class="(.*?)"\>/gm.exec(this.preparedAdvancedHTML);
              let refImageClass = '';
              if (refImageClassMatch) {
                if (refImageClassMatch[1]) {
                  refImageClass = refImageClassMatch[1];
                }
                if (refImageClassMatch[2]) {
                  refImageClass = refImageClassMatch[2];
                }
              }

              const messageTemplate = get(alert, 'messageTemplate', '')
                .replace(/\{name\}/g, '{name:highlight}')
                .replace(/\{recipient\}/g, '{recipient:highlight}')
                .replace(/\{amount\}/g, '{amount:highlight}')
                .replace(/\{monthsName\}/g, '{monthsName:highlight}')
                .replace(/\{currency\}/g, '{currency:highlight}')
              this.preparedAdvancedHTML =
                this.preparedAdvancedHTML
                  .replace(/\{message\}/g, `
                    <span :style="{
                      'font-family': runningAlert.alert.message.font.family + ' !important',
                      'font-size': runningAlert.alert.message.font.size + 'px !important',
                      'font-weight': runningAlert.alert.message.font.weight + ' !important',
                      'color': runningAlert.alert.message.font.color + ' !important',
                      'text-shadow': [textStrokeGenerator(runningAlert.alert.message.font.borderPx, runningAlert.alert.message.font.borderColor), shadowGenerator(runningAlert.alert.message.font.shadow)].filter(Boolean).join(', ') + ' !important'
                    }"
                    v-html="withEmotes(runningAlert.message)"></span>`)
                  .replace(/\{messageTemplate\}/g, messageTemplate)
                  .replace(/\{name\}/g, emitData.name)
                  .replace(/\{recipient\}/g, emitData.recipient || '')
                  .replace(/\{amount\}/g, String(emitData.amount))
                  .replace(/\{monthsName\}/g, emitData.monthsName)
                  .replace(/\{currency\}/g, emitData.currency)
                  .replace(/\{name:highlight\}/g, `<v-runtime-template :template="prepareMessageTemplate('{name:highlight}')"></v-runtime-template>`)
                  .replace(/\{recipient:highlight\}/g, `<v-runtime-template :template="prepareMessageTemplate('{recipient:highlight}')"></v-runtime-template>`)
                  .replace(/\{amount:highlight\}/g, `<v-runtime-template :template="prepareMessageTemplate('{amount:highlight}')"></v-runtime-template>`)
                  .replace(/\{monthsName:highlight\}/g, `<v-runtime-template :template="prepareMessageTemplate('{monthsName:highlight}')"></v-runtime-template>`)
                  .replace(/\{currency:highlight\}/g, `<v-runtime-template :template="prepareMessageTemplate('{currency:highlight}')"></v-runtime-template>`)
                  .replace('"wrap"', '"wrap-' + alert.id +'"')
                  .replace(/\<div.*class="(.*?)".*ref="text"\>|\<div.*ref="text".*class="(.*?)"\>/gm, '<div ref="text">') // we need to replace ref with class with proper ref
                  .replace('ref="text"', `
                    v-if="runningAlert.isShowingText"
                    :class="{['animate__' + runningAlert.animation]: true }"
                    class=" animate__animated ${refTextClass}"
                    :style="{
                      'animation-duration': runningAlert.animationSpeed + 'ms',
                      'font-family': runningAlert.alert.font.family,
                      'font-size': runningAlert.alert.font.size + 'px',
                      'font-weight': runningAlert.alert.font.weight,
                      'color': runningAlert.alert.font.color,
                      'text-align': runningAlert.alert.font.align,
                      'text-shadow': [textStrokeGenerator(runningAlert.alert.font.borderPx, runningAlert.alert.font.borderColor), shadowGenerator(runningAlert.alert.font.shadow)].filter(Boolean).join(', ')
                    }"
                  `)
                  .replace(/\<div.*class="(.*?)".*ref="image"\>|\<div.*ref="image".*class="(.*?)"\>/gm, '<div ref="image">') // we need to replace ref with class with proper ref
                  .replace('ref="image"', `
                    v-if="runningAlert.isShowingText && showImage"
                    @error="showImage=false"
                    :class="{['animate__' + runningAlert.animation]: true}"
                    :style="{
                      'animation-duration': runningAlert.animationSpeed + 'ms'
                    }"
                    class="animate__animated ${refImageClass}"
                    :src="'/registry/alerts/' + runningAlert.alert.imageId"
                  `);

              // load CSS
              if (!this.loadedCSS.includes(alert.id)) {
                console.debug('loaded custom CSS for ' + alert.id);
                this.loadedCSS.push(alert.id);
                const head = document.getElementsByTagName('head')[0]
                const style = document.createElement('style')
                style.type = 'text/css';
                const css = alert.advancedMode.css
                  .replace(/\#wrap/g, '#wrap-' + alert.id) // replace .wrap with only this goal wrap
                style.appendChild(document.createTextNode(css));
                head.appendChild(style);
              }

              // eval JS
              this.$nextTick(() => {
                // eval onStarted
                this.$nextTick(() => {
                  if (alert && alert.enableAdvancedMode) {
                    eval(`${alert.advancedMode.js}; if (typeof onStarted === 'function') { onStarted() } else { console.log('no onStarted() function found'); }`);
                  }
                });
              })
            } else {
              // we need to add :highlight to name, amount, monthName, currency by default
              alert.messageTemplate = alert.messageTemplate
                .replace(/\{name\}/g, '{name:highlight}')
                .replace(/\{recipient\}/g, '{recipient:highlight}')
                .replace(/\{amount\}/g, '{amount:highlight}')
                .replace(/\{monthName\}/g, '{monthName:highlight}')
                .replace(/\{currency\}/g, '{currency:highlight}');
            }

            const isAmountForTTSInRange = alert.tts.minAmountToPlay <= emitData.amount;
            this.runningAlert = {
              ...emitData,
              animation: "none",
              animationText: "none",
              animationSpeed: 1000,
              soundPlayed: false,
              isShowing: false,
              isShowingText: false,
              showAt: this.data.alertDelayInMs + Date.now(),
              hideAt: this.data.alertDelayInMs + Date.now() + alert.alertDurationInMs + alert.animationInDuration,
              showTextAt: this.data.alertDelayInMs + Date.now() + alert.alertTextDelayInMs,
              waitingForTTS: alert.tts.enabled && isAmountForTTSInRange && typeof window.responsiveVoice !== 'undefined',
              alert,
            };
          } else {
            this.runningAlert = null;
          }
        } else {
          this.runningAlert = null;
        }
      }
    }, 1000));

    this.id = this.$route.params.id
    this.refreshAlert();

    this.socket.on('alert', (data: EmitData) => {
      console.debug('Incoming alert', data);

      // checking for vulgarities
      for (let vulgar of this.defaultProfanityList) {
        if (this.data) {
          if (this.data.profanityFilterType === 'replace-with-asterisk') {
            data.message = data.message.replace(new RegExp(vulgar, 'gmi'), '***')
          } else if (this.data.profanityFilterType === 'replace-with-happy-words') {
            data.message = data.message.replace(new RegExp(vulgar, 'gmi'), this.listHappyWords[Math.floor(Math.random() * this.listHappyWords.length)])
          } else if (this.data.profanityFilterType === 'hide-messages') {
            if (data.message.search(new RegExp(vulgar, 'gmi')) >= 0) {
              console.debug('Message contain vulgarity "' + vulgar + '" and is hidden.')
              data.message = '';
            }
          } else if (this.data.profanityFilterType === 'disable-alerts') {
            if (data.message.search(new RegExp(vulgar, 'gmi')) >= 0) {
              console.debug('Message contain vulgarity "' + vulgar + '" and is alert disabled.');
              return;
            }
          }
        }
      }

      alerts.push(data)
    })
  }

  refreshAlert() {
    this.socket.emit('isAlertUpdated', { updatedAt: this.updatedAt, id: this.id }, async (err: Error | null, isUpdated: boolean, updatedAt: number) => {
      if (err) {
        return console.error(err)
      }

      if (isUpdated && this.updatedAt > 0) {
        location.reload(); // reload full page to be sure we have latest alert version
      }

      if (isUpdated && this.updatedAt === -1) {
        console.debug('Alert is loading...')
        this.updatedAt = updatedAt;
        await new Promise<void>((resolve) => {
          this.socket.emit('generic::getOne', this.id, async (err: string | null, data: AlertInterface) => {
            if (err) {
              return console.error(err);
            }
            try {
              if (this.runningAlert !== null) {
                return; // skip any changes if alert in progress
              }
              if (!isEqual(data, this.data)) {
                this.data = data;

                // determinate if image is image or video
                for (const event of [
                  ...this.data.subcommunitygifts,
                  ...this.data.hosts,
                  ...this.data.raids,
                  ...this.data.tips,
                  ...this.data.cheers,
                  ...this.data.resubs,
                  ...this.data.subs,
                  ...this.data.follows,
                  ...this.data.subgifts,
                  ...this.data.cmdredeems,
                  ...this.data.rewardredeems,
                ]) {
                  fetch('/registry/alerts/' + event.soundId)
                    .then(response => {
                      if (!response.ok) {
                        throw new Error('Network response was not ok');
                      }
                      return response.blob();
                    })
                    .then(myBlob => {
                      console.log(`Audio ${event.soundId} was found on server.`);
                      this.typeOfMedia.set(event.soundId, 'audio');
                    })
                    .catch(error => {
                      this.typeOfMedia.set(event.soundId, null);
                      console.error(`Audio ${event.soundId} was not found on server.`);
                    });
                  fetch('/registry/alerts/' + event.imageId)
                    .then(response => {
                      if (!response.ok) {
                        throw new Error('Network response was not ok');
                      }
                      return response.blob();
                    })
                    .then(myBlob => {
                      console.log(`${myBlob.type.startsWith('video') ? 'Video' : 'Image'} ${event.imageId} was found on server.`);
                      this.typeOfMedia.set(event.imageId, myBlob.type.startsWith('video') ? 'video' : 'image');
                    })
                    .catch(error => {
                      this.typeOfMedia.set(event.imageId, null);
                      console.error(`Image/Video ${event.imageId} was not found on server.`);
                    });
                }

                for (const [lang, isEnabled] of Object.entries(this.data.loadStandardProfanityList)) {
                  if (isEnabled) {
                    let list = require('../../bot/data/vulgarities/' + lang + '.txt');
                    this.defaultProfanityList = [...this.defaultProfanityList, ...list.default.split(/\r?\n/)]

                    let listHappyWords = require('../../bot/data/happyWords/' + lang + '.txt');
                    this.listHappyWords = [...this.listHappyWords, ...listHappyWords.default.split(/\r?\n/)].filter(o => o.trim().length > 0)
                  }
                }

                this.defaultProfanityList = [
                  ...this.defaultProfanityList,
                  ...data.customProfanityList.split(',').map(o => o.trim()),
                ].filter(o => o.trim().length > 0)

                console.debug('Profanity list', this.defaultProfanityList);
                console.debug('Happy words', this.listHappyWords);
                this.state.loaded = this.$state.success;

                const head = document.getElementsByTagName('head')[0]
                const style = document.createElement('style')
                style.type = 'text/css';
                for (const event of [
                  ...data.cheers,
                  ...data.follows,
                  ...data.hosts,
                  ...data.raids,
                  ...data.resubs,
                  ...data.subgifts,
                  ...data.subs,
                  ...data.tips,
                  ...data.cmdredeems,
                  ...data.rewardredeems,
                ]) {
                  if (!this.loadedFonts.includes(event.font.family)) {
                    console.debug('Loading font', event.font.family)
                    this.loadedFonts.push(event.font.family)
                    const font = event.font.family.replace(/ /g, '+')
                    const css = "@import url('https://fonts.googleapis.com/css?family=" + font + "');"
                    style.appendChild(document.createTextNode(css));
                  }
                  if (typeof (event as AlertTipInterface).message !== 'undefined' && !this.loadedFonts.includes((event as AlertTipInterface).message.font.family)) {
                    console.debug('Loading font', (event as AlertTipInterface).message.font.family)
                    this.loadedFonts.push((event as AlertTipInterface).message.font.family)
                    const font = (event as AlertTipInterface).message.font.family.replace(/ /g, '+')
                    const css = "@import url('https://fonts.googleapis.com/css?family=" + font + "');"
                    style.appendChild(document.createTextNode(css));
                  }
                }
                head.appendChild(style);

                // load emotes
                await new Promise<void>((done) => {
                  this.socketEmotes.emit('getCache', (err: string | null, data: any) => {
                    if (err) {
                      return console.error(err);
                    }
                    this.emotes = data;
                    console.debug('= Emotes loaded')
                    done();
                  })
                })

                console.debug('== alerts ready ==')
                resolve();
              }
            } catch (e) {
              console.error({data});
              console.error(e);
            }
          })
        })
      }

      setTimeout(() => this.refreshAlert(), 10000)
    })


  }

  prepareMessageTemplate(msg: string) {
    if (this.runningAlert !== null) {
      let name: string | string[] = this.runningAlert.name.split('').map((char, index) => {
        if (this.runningAlert !== null) {
          return `<div class="animate__animated animate__infinite animate__${this.runningAlert.alert.animationText} animate__${this.runningAlert.alert.animationTextOptions.speed}" style="animation-delay: ${index * 50}ms; color: ${this.runningAlert.alert.font.highlightcolor}; display: inline-block;">${char}</div>`;
        } else {
          return char;
        }
      })
      let recipient: string | string[] = (this.runningAlert.recipient || '').split('').map((char, index) => {
        if (this.runningAlert !== null) {
          return `<div class="animate__animated animate__infinite animate__${this.runningAlert.alert.animationText} animate__${this.runningAlert.alert.animationTextOptions.speed}" style="animation-delay: ${index * 50}ms; color: ${this.runningAlert.alert.font.highlightcolor}; display: inline-block;">${char}</div>`;
        } else {
          return char;
        }
      })

      let amount: string | string[] = String(this.runningAlert.amount).split('').map((char, index) => {
        if (this.runningAlert !== null) {
          return `<div class="animate__animated animate__infinite animate__${this.runningAlert.alert.animationText} animate__${this.runningAlert.alert.animationTextOptions.speed}" style="animation-delay: ${index * 50}ms; color: ${this.runningAlert.alert.font.highlightcolor}; display: inline-block;">${char}</div>`;
        } else {
          return char;
        }
      })

      let currency: string | string[] = String(this.runningAlert.currency).split('').map((char, index) => {
        if (this.runningAlert !== null) {
          return `<div class="animate__animated animate__infinite animate__${this.runningAlert.alert.animationText} animate__${this.runningAlert.alert.animationTextOptions.speed}" style="animation-delay: ${index * 50}ms; color: ${this.runningAlert.alert.font.highlightcolor}; display: inline-block;">${char}</div>`;
        } else {
          return char;
        }
      })

      let monthsName: string | string[] = String(this.runningAlert.monthsName).split('').map((char, index) => {
        if (this.runningAlert !== null) {
          return `<div class="animate__animated animate__infinite animate__${this.runningAlert.alert.animationText} animate__${this.runningAlert.alert.animationTextOptions.speed}" style="animation-delay: ${index * 50}ms; color: ${this.runningAlert.alert.font.highlightcolor}; display: inline-block;">${char}</div>`;
        } else {
          return char;
        }
      })

      if (this.runningAlert.alert.animationText === 'baffle') {
        let maxTimeToDecrypt = this.runningAlert.alert.animationTextOptions.maxTimeToDecrypt
        // set maxTimeToDecrypt 0 if fading out to not reset decryption
        if (this.runningAlert.hideAt - Date.now() <= 0
          && !isTTSPlaying
          && !this.runningAlert.waitingForTTS) {
          maxTimeToDecrypt = 0;
        }
        name = `<baffle :key="'name-' + this.runningAlert.name" :text="this.runningAlert.name" :options="{...this.runningAlert.alert.animationTextOptions, maxTimeToDecrypt: ${maxTimeToDecrypt}}" style="color: ${this.runningAlert.alert.font.highlightcolor}"/>`
        recipient = `<baffle :key="'recipient-' + this.runningAlert.recipient" :text="this.runningAlert.recipient" :options="{...this.runningAlert.alert.animationTextOptions, maxTimeToDecrypt: ${maxTimeToDecrypt}}" style="color: ${this.runningAlert.alert.font.highlightcolor}"/>`
        amount = `<baffle :key="'amount-' + this.runningAlert.amount" :text="String(this.runningAlert.amount)" :options="{...this.runningAlert.alert.animationTextOptions, maxTimeToDecrypt: ${maxTimeToDecrypt}}" style="color: ${this.runningAlert.alert.font.highlightcolor}"/>`
        currency = `<baffle :key="'currency-' + this.runningAlert.currency" :text="this.runningAlert.currency" :options="{...this.runningAlert.alert.animationTextOptions, maxTimeToDecrypt: ${maxTimeToDecrypt}}" style="color: ${this.runningAlert.alert.font.highlightcolor}"/>`
        monthsName = `<baffle :key="'monthsName-' + this.runningAlert.monthsName" :text="this.runningAlert.monthsName" :options="{...this.runningAlert.alert.animationTextOptions, maxTimeToDecrypt: ${maxTimeToDecrypt}}" style="color: ${this.runningAlert.alert.font.highlightcolor}"/>`
      } else {
        name = name.join('');
        recipient = recipient.join('');
        amount = amount.join('');
        currency = currency.join('');
        monthsName = monthsName.join('');
      }
      msg = msg
        .replace(/\{name:highlight\}/g, name)
        .replace(/\{recipient:highlight\}/g, recipient)
        .replace(/\{amount:highlight\}/g, amount)
        .replace(/\{currency:highlight\}/g, currency)
        .replace(/\{monthsName:highlight\}/g, monthsName)
        .replace(/\{name\}/g, this.runningAlert.name)
        .replace(/\{amount\}/g, String(this.runningAlert.amount))
        .replace(/\{currency\}/g, this.runningAlert.currency)
        .replace(/\{monthsName\}/g, this.runningAlert.monthsName);
    }
    return `<span>${msg}</span>`;
  }
}
</script>

<style scoped>
  .debug {
    z-index: 9999;
    background-color: rgba(255, 255, 255, 0.5);
    position: absolute;
    color: white;
    padding: 1rem;
  }

  .center {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: max-content;
  }

  .layout-1 {
    display: flex;
    flex-direction: column;
  }
  .layout-2 {
    display: flex;
    flex-direction: column-reverse;
  }
  .layout-3 {
    display: flex;
  }
  .layout-4 {
    display: flex;
    align-items: center;
    flex-direction: row-reverse;
  }
  .layout-5 {
    display: flex;
    align-items: center;
    flex-direction: row;
  }

  img {
    max-width: max-content;
    margin-left: auto;
    margin-right: auto;
  }

  audio {
    visibility: hidden;
    position: absolute;
  }
</style>