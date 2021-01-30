// bot libraries
import { settings } from '../decorators';
import Integration from './_interface';

class ResponsiveVoice extends Integration {
  _enabled = null; // cannot be enabled / disabled

  @settings('api')
  key = '';
}

export default new ResponsiveVoice();
