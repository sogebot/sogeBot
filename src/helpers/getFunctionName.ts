export function getFunctionName() {
  const stackLine = (new Error())!.stack!.split('\n')[2].trim();
  const fncName = stackLine.match(/at Object.([^ ]+)/)?.[1];
  return fncName;
}