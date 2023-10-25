import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';

import { name } from './name.js';

function getPointsName (points: number): string {
  return getLocalizedName(points, name.value);
}

export { getPointsName };