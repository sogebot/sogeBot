<template>
  <span>
    {{ baffledText }}
  </span>
</template>

<script lang="ts">
import {
  computed, defineComponent, onMounted, onUnmounted, reactive, ref, watch, 
} from '@vue/composition-api';

const getTimeToReveal = (text: string, maxTimeToDecrypt: number) => {
  const baffledTimeToReveal = [];
  for (let i = 0; i < text.length; i++) {
    baffledTimeToReveal.push(Math.floor(Math.random() * 1000) + (maxTimeToDecrypt - 1000));
  }
  return baffledTimeToReveal;
};

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
    text:    String,
    options: Object,
  },
  setup(props: Props) {
    const interval = ref(0);
    const options = reactive({
      startTime:    0,
      changeTime:   0,
      exclude:      [' '],
      baffledArray: props.text.split(''),
    });
    const baffledTimeToReveal: number[] = reactive([]);
    const baffledText = computed(() => options.baffledArray.join(''));

    const start = () => {
      const timeToReveal = getTimeToReveal(props.text, props.options.maxTimeToDecrypt);
      console.debug('== baffle', {
        interval: interval.value, text: props.text, options: props.options, timeToReveal, 
      });
      clearInterval(interval.value);
      while(baffledTimeToReveal.length > 0) {
        baffledTimeToReveal.shift(); 
      }
      while(baffledTimeToReveal.length !== timeToReveal.length) {
        baffledTimeToReveal.push(timeToReveal[baffledTimeToReveal.length]); 
      }

      options.startTime = Date.now();
      interval.value = window.setInterval(() => {
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
      }, 2);
    };

    onMounted(() => {
      start();
    });
    onUnmounted(() => clearInterval(interval.value));

    watch(() => props, () => start(), { deep: true });
    return { baffledText };
  },
});
</script>