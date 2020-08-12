import Color from 'color';

export function textStrokeGenerator(radius: number, color: string) {
  if (radius === 0) {
    return '';
  }

  // config
  const steps = 30;
  const blur = 2;
  // generate text shadows, spread evenly around a circle
  const radianStep = steps / (Math.PI * 2);
  let cssStr = '';
  for (let r=1; r <= radius; r++) {
    for(let i=0; i < steps; i++) {
      const curRads = radianStep * i;
      const xOffset = (r * Math.sin(curRads)).toFixed(1);
      const yOffset = (r * Math.cos(curRads)).toFixed(1);
      if(i > 0 || r > 1) {
        cssStr += ', ';
      }
      cssStr += xOffset + 'px ' + yOffset + 'px ' + blur + 'px ' + color;
    }
  }
  return cssStr;
}

export function shadowGenerator(shadow: {
  shiftRight: number;
  shiftDown: number;
  blur: number;
  opacity: number;
  color: string;
}[] | undefined) {
  const output = [];
  if (shadow) {
    for (const s of shadow) {
      output.push(`${s.shiftRight}px ${s.shiftDown}px ${s.blur}px ${Color(s.color).alpha(s.opacity / 100)}`);
    }
  }
  return output.join(', ');
}