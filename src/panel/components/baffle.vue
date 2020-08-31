<template>
  <span>
    {{ baffledText }}
  </span>
</template>

<script lang="ts">
import { defineComponent, reactive, onUnmounted, onMounted, watch, computed } from '@vue/composition-api'

let interval = 0

const getTimeToReveal = (text: string, maxTimeToDecrypt: number) => {
  const baffledTimeToReveal = [];
  for (let i = 0; i < text.length; i++) {
    baffledTimeToReveal.push(Math.floor(Math.random() * 1000) + (maxTimeToDecrypt - 1000));
  }
  return baffledTimeToReveal;
}

interface Props {
  text: string;
  options: {
    maxTimeToDecrypt: number,
    speed: number,
    characters: string[],
  }
}
export default defineComponent({
  props: {
    text: String,
    options: Object,
  },
  setup(props: Props) {
    const options = reactive({
      startTime: 0,
      changeTime: 0,
      exclude: [' '],
      baffledArray: props.text.split(''),
    })
    let baffledTimeToReveal: number[] = reactive([]);
    const baffledText = computed(() => options.baffledArray.join(''));

    const start = () => {
      console.debug('== baffle', { interval, text: props.text, options: props.options});
      clearInterval(interval);
      const timeToReveal = getTimeToReveal(props.text, props.options.maxTimeToDecrypt)
      while(baffledTimeToReveal.length > 0) { baffledTimeToReveal.shift() };
      while(baffledTimeToReveal.length !== timeToReveal.length) { baffledTimeToReveal.push(timeToReveal[baffledTimeToReveal.length]) }

      options.startTime = Date.now();
      interval = window.setInterval(() => {
        if (Date.now() - options.changeTime > props.options.speed) {
          options.changeTime = Date.now();
          const length = options.baffledArray.length;
          options.baffledArray = [];
          for (let i = 0; i < length; i++) {
            if (options.exclude.includes(props.text[i]) || baffledTimeToReveal[i] <= Date.now() - options.startTime) {
              options.baffledArray.push(props.text[i]);
            } else {
              options.baffledArray.push(props.options.characters[Math.floor(Math.random() * props.options.characters.length)]);
            }
          }
        }
      }, 2)
    }

    onMounted(() => {
      start()
    });
    onUnmounted(() => clearInterval(interval))

    watch(() => props, () => start(), { deep: true });
    return { baffledText }
  }
})
</script>