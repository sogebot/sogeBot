<template>
  <div>
    <img
      v-for="e of images"
      :key="e.id"
      v-show="currentImage === e.order"
      :id="e.id"
      :ref="e.id"
      :src="'data:' + e.type + ';base64,'  + e.base64"
    >
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { gsap } from 'gsap'
import { getSocket } from 'src/panel/helpers/socket';

@Component({})
export default class CarouselOverlay extends Vue {
  currentImage: any = null;
  ready = true;
  show = true;
  socket = getSocket('/overlays/carousel', true);
  images: any[] = [];
  interval: any[] = [];

  beforeDestroy() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  }

  created() {
    this.socket.emit('generic::getAll', (err: string | null, images: any[]) => {
      if (err) {
        return console.error(err)
      }
      this.images = images
    })
    this.interval.push(setInterval(() => {
      this.triggerAnimation()
    }, 100));
  }

  wait (type: string) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(), this.images[this.currentImage][type])
    })
  }

  doEnterAnimation() {
    let animation: any = { opacity: 1 };

    // force refresh of styles
    (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.filter = 'blur(0px)';
    (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.top = '0';
    (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.left = '0';
    (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.opacity = '0';

    switch (this.images[this.currentImage].animationIn) {
      case 'blurIn':
        (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.filter = 'blur(50px)';
        animation = { filter: 'blur(0px)', opacity: 1 }
        break
      case 'slideUp':
        (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.opacity = '1';
        (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.top = window.innerHeight + 'px';
        animation = { top: 0 }
        break
      case 'slideDown':
        (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.opacity = '1';
        (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.top = -(this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].clientHeight + 'px';
        animation = { top: 0 }
        break
      case 'slideLeft':
        (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.opacity = '1';
        (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.left = window.innerWidth + 'px';
        animation = { left: 0 }
        break
      case 'slideRight':
        (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.opacity = '1';
        (this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].style.left = -(this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].clientWidth + 'px';
        animation = { left: 0 }
        break
    }

    return new Promise((resolve, reject) => {
      gsap.to((this.$refs[this.images[this.currentImage].id] as HTMLElement[]), {
        duration: this.images[this.currentImage].animationInDuration / 1000,
        ...animation,
        onComplete: () => {
          resolve()
        }
      })
    })
  }

  doLeaveAnimation() {
    let animation: any = { opacity: 0 }

    switch (this.images[this.currentImage].animationOut) {
      case 'blurOut':
        animation = { filter: 'blur(50px)', opacity: 0 }
        break
      case 'slideUp':
        animation = { top: -(this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].clientHeight + 'px' }
        break
      case 'slideDown':
        animation = { top: window.innerHeight + 'px' }
        break
      case 'slideLeft':
        animation = { left: -(this.$refs[this.images[this.currentImage].id] as HTMLElement[])[0].clientWidth + 'px' }
        break
      case 'slideRight':
        animation = { left: window.innerWidth + 'px' }
        break
    }

    return new Promise((resolve, reject) => {
      gsap.to((this.$refs[this.images[this.currentImage].id] as HTMLElement[]), {
        duration: this.images[this.currentImage].animationOutDuration / 1000,
        ...animation,
        onComplete: () => {
          resolve()
        }
      })
    })
  }

  async triggerAnimation() {
    if (this.ready && this.images.length > 0) {
      this.ready = false
      if (this.currentImage === null) this.currentImage = 0
      else this.currentImage++
      if (this.images.length <= this.currentImage) this.currentImage = 0

      await this.wait('waitBefore')
      await this.doEnterAnimation()
      await this.wait('duration')
      await this.doLeaveAnimation()
      await this.wait('waitAfter')
      this.ready = true
    }
  }
}
</script>

<style scoped>
img {
  width: 100%;
  opacity: 0;
  position: absolute;
}
</style>

