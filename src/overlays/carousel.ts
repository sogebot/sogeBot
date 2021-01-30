import { onStartup } from '../decorators/on';
import Overlay from './_interface';

class Carousel extends Overlay {
  showInUI = false;

  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'registry', name: 'carouseloverlay', id: 'registry.carousel', this: null,
    });
  }
}

export default new Carousel();
