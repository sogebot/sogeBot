import Core from './_interface';
import { settings, ui } from './decorators';

class UI extends Core {
  @settings()
  @ui({
    type: 'selector',
    values: ['light', 'dark'],
  })
  public theme: 'light' | 'dark' = 'light';

  @settings()
  public percentage: boolean = true;

  @settings()
  public shortennumbers: boolean = true;

  @settings()
  public stickystats: boolean = true;

  @settings()
  public showdiff: boolean = true;
}

module.exports = UI;
