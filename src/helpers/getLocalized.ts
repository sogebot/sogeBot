export function getLocalizedName(number: number | string, translation: string): string {
  let single;
  let multi;
  let xmulti: { [x: string]: number } | null = null;
  let name;
  const names = translation.split('|').map(Function.prototype.call, String.prototype.trim);
  number = typeof number === 'string' ? parseInt(number, 10) : number;

  switch (names.length) {
    case 1:
      single = multi = names[0];
      break;
    case 2:
      single = names[0];
      multi = names[1];
      break;
    default: {
      const len = names.length;
      single = names[0];
      multi = names[len - 1];
      xmulti = {};

      for (let i = 0; i < names.length; i++) {
        if (i !== 0 && i !== len - 1) {
          const maxPts = names[i].split(':')[0];
          xmulti[maxPts] = names[i].split(':')[1];
        }
      }
      break;
    }
  }

  name = (number === 1 ? single : multi);
  if (xmulti !== null && number > 1 && number <= 10) {
    for (let i = number; i <= 10; i++) {
      if (typeof xmulti[i] === 'string') {
        name = xmulti[i];
        break;
      }
    }
  }
  return name;
}