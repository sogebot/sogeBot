import { name } from './name';

function getPointsName (points: number): string {
  const pointsNames = name.value.split('|').map(Function.prototype.call, String.prototype.trim);
  let single, multi;
  let xmulti: null | { [points: string]: string } = null;
  // get single|x:multi|multi from pointsName
  if (name.value.length === 0) {
    return '';
  } else {
    switch (pointsNames.length) {
      case 1:
        single = multi = pointsNames[0];
        break;
      case 2:
        single = pointsNames[0];
        multi = pointsNames[1];
        break;
      default: {
        const len = pointsNames.length;
        single = pointsNames[0];
        multi = pointsNames[len - 1];
        xmulti = pointsNames.reduce((prev: { [points: string]: string }, cur: string) => {
          const [maxPts, _name] = cur.split(':');
          return { ...prev, [String(maxPts)]: _name };
        }, {});
        break;
      }
    }
  }

  let pointsName = (points === 1 ? single : multi);
  if (xmulti !== null && typeof xmulti === 'object' && points > 1 && points <= 10) {
    for (let i = points; i <= 10; i++) {
      if (typeof xmulti[i] === 'string') {
        pointsName = xmulti[i];
        break;
      }
    }
  }
  return pointsName;
}

export { getPointsName };