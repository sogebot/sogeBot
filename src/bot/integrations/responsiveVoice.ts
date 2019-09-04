// bot libraries
import Integration from './_interface';
import { settings, ui } from '../decorators';

class ResponsiveVoice extends Integration {
  _enabled = null; // cannot be enabled / disabled

  @settings('api')
  @ui({ type: 'text-input', secret: true })
  key = '';
}

export default ResponsiveVoice;
export { ResponsiveVoice };
