// bot libraries
import { settings, ui } from '../decorators';
import Integration from './_interface';

class ResponsiveVoice extends Integration {
  _enabled = null; // cannot be enabled / disabled

  @settings('api')
  @ui({ type: 'text-input', secret: true })
  key = '';
}

export default new ResponsiveVoice();
