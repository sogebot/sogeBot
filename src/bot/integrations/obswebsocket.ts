import { settings, ui } from '../decorators';
import Integration from './_interface';

class OBSWebsocket extends Integration {
  @settings('connection')
  address = 'localhost:4444';
  @settings('connection')
  @ui({ type: 'text-input', secret: true })
  password = '';
}

export default new OBSWebsocket();
