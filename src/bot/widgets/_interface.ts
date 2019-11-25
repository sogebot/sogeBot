import Module from '../_interface';
console.log({Module});
class Widget extends Module {
  constructor() {
    super('widgets', true);
  }
}

export default Widget;
