export const avgTime = new Map<string, number[]>();
const NS_PER_SEC = 1e9;

export function logAvgTime(functionName: string, time: [ seconds: number, nanoseconds: number ]) {
  const data = avgTime.get(functionName) ?? [];
  const nanoseconds = time[0] * NS_PER_SEC + time[1];
  data.push(nanoseconds / 1000000);
  if (data.length > 250) {
    data.reverse();
    data.length = 250;
    data.reverse();
  }
  avgTime.set(functionName, data);
}