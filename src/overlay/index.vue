<template>
<div id="overlays">
  <overlay :token="token" :commons="commons"></overlay>
</div>
</template>

<script>
export default {
  props: ['commons', 'token'],
  components: {
    overlay: () => import('./components/' + window.location.pathname.split('/')[2] + '.vue')
  }
}
</script>