<template>
  <span>
    {{ baffledText }}
  </span>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';

@Component({})
export default class baffleText extends Vue {
  @Prop() readonly text !: string;
  @Prop() readonly options !: any;

  interval: number = 0;
  startTime: number = 0;
  changeTime: number = 0

  exclude = [' ']

  baffledArray = this.text.split('');
  baffledTimeToReveal: number[] = []

  setTimeToReveal() {
    this.baffledTimeToReveal = [];
    for (let i = 0; i < this.text.length; i++) {
      this.baffledTimeToReveal.push(Math.floor(Math.random() * 1000) + (this.options.maxTimeToDecrypt - 1000));
    }
  }

  get baffledText() {
    return this.baffledArray.join('');
  }

  mounted() {
    this.start()
  }

  @Watch('options', { deep: true })
  start() {
    clearInterval(this.interval);
    this.setTimeToReveal();
    this.startTime = Date.now();
    this.interval = window.setInterval(() => {
      if (Date.now() - this.changeTime > this.options.speed) {
        this.changeTime = Date.now();
        const length = this.baffledArray.length;
        this.baffledArray = [];
        for (let i = 0; i < length; i++) {
          if (this.exclude.includes(this.text[i]) || this.baffledTimeToReveal[i] <= Date.now() - this.startTime) {
            this.baffledArray.push(this.text[i]);
          } else {
            this.baffledArray.push(this.options.characters[Math.floor(Math.random() * this.options.characters.length)]);
          }
        }
      }
    }, 2)
  }

  beforeDestroyed() {
    clearInterval(this.interval);
  }

}
</script>