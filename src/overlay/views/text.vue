<template>
  <div v-html="text" id="main"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from '@vue/composition-api'
import { getSocket } from 'src/panel/helpers/socket';

const socket = getSocket('/registries/text', true);

export default defineComponent({
  setup(props, ctx) {
    const text = ref('');
    const js = ref(null as any);
    const css = ref(null as any);
    const external = ref(false);

    const onChange = () => {
      if (js.value) {
        console.group('onChange()')
        console.log(js.value)
        console.groupEnd()
        eval(js.value + ';if (typeof onChange === "function") { onChange(); }')
      }
    };

    const refresh = (forceRefresh = false) => {
      if (ctx.root.$route.params.id) {
        socket.emit('generic::getOne', { id: ctx.root.$route.params.id, parseText: true, forceRefresh }, (err: string | null, cb: { external: string, text: string, js: string, css: string }) => {
          if (err) {
            return console.warn(err);
          }
          if (!cb) {
            return console.warn('No text overlay found with id ' + ctx.root.$route.params.id);
          }
          if (!external.value) {
            if (cb.external) {
              for (let link of cb.external) {
                var script = document.createElement('script')
                script.src = link
                document.getElementsByTagName('head')[0].appendChild(script)
              }
            }
            external.value = true
          }

          setTimeout(() => {
            const isChanged = text.value !== '' && text.value !== cb.text;
            text.value = cb.text
            ctx.root.$nextTick(() => {
              if (!js.value && cb.js) js.value = cb.js
              if (!css.value && cb.css) css.value = cb.css
              if (isChanged) {
                onChange();
              }
            })
          }, 100)
        })
      } else {
        console.error('Missing id param in url')
      }
    };

    onMounted(() => {
      refresh(true);
      setInterval(() => refresh(false), 1000);
    });

    watch(css, (val: string) => {
      const head = document.getElementsByTagName('head')[0]
      const style = (document.createElement('style') as any)
      style.type = 'text/css';
      if (style.styleSheet){
        // This is required for IE8 and below.
        style.styleSheet.cssText = val;
      } else {
        style.appendChild(document.createTextNode(val));
      }
      head.appendChild(style);
    });

    watch(js, (val: string) => {
      console.group('onLoad()')
      console.log(val)
      console.groupEnd()
      eval(val + ';if (typeof onLoad === "function") { onLoad(); }')
    });

    return {
      text, js, css, external,
    }
  }
});
</script>