<template>
  <div
    id="main"
    v-html="text"
  />
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import {
  defineComponent, onMounted, ref, watch,
} from '@vue/composition-api';

const socket = getSocket('/registries/text', true);

export default defineComponent({
  setup(props, ctx) {
    const nonParsedText = ref('');
    const text = ref('');
    const js = ref(null as any);
    const css = ref(null as any);
    const external = ref(false);

    const onChange = () => {
      if (js.value) {
        console.group('onChange()');
        console.log(js.value);
        console.groupEnd();
        eval(js.value + ';if (typeof onChange === "function") { onChange(); }');
      }
    };

    const refresh = () => {
      return new Promise(resolve => {
        console.debug(`${Date().toLocaleString()} - refresh()`);
        if (ctx.root.$route.params.id) {
          socket.emit('generic::getOne', { id: ctx.root.$route.params.id, parseText: true }, (err: string | null, cb: { external: string, text: string, js: string, css: string, parsedText: string }) => {
            if (err) {
              return console.error(err);
            }
            if (!cb) {
              return console.warn('No text overlay found with id ' + ctx.root.$route.params.id);
            }
            if (!external.value) {
              if (cb.external) {
                for (const link of cb.external) {
                  const script = document.createElement('script');
                  script.src = link;
                  document.getElementsByTagName('head')[0].appendChild(script);
                }
              }
              external.value = true;
            }

            setTimeout(() => {
              const isChanged = text.value !== '' && text.value !== cb.parsedText;
              nonParsedText.value = cb.text;
              text.value = cb.parsedText;
              ctx.root.$nextTick(() => {
                if (!js.value && cb.js) {
                  js.value = cb.js;
                }
                if (!css.value && cb.css) {
                  css.value = cb.css;
                }
                if (isChanged) {
                  onChange();
                }
                resolve(true);
              });
            }, 100);
          });
        } else {
          console.error('Missing id param in url');
          resolve(true);
        }
      });
    };

    onMounted(async () => {
      await refresh();
      socket.on('variable-changed', (variableName: string) => {
        if (nonParsedText.value.includes(variableName)) {
          console.log(`Variable ${variableName} changed. Refreshing.`);
          refresh();
        }
      });
    });

    watch(css, (val: string) => {
      const head = document.getElementsByTagName('head')[0];
      const style = (document.createElement('style') as any);
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
      console.group('onLoad()');
      console.log(val);
      console.groupEnd();
      eval(val + ';if (typeof onLoad === "function") { onLoad(); }');
    });

    return {
      text, js, css, external,
    };
  },
});
</script>