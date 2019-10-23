const endpoints: {
  type: 'admin' | 'viewer' | 'public';
  on: string;
  nsp: string;
  callback: Function;
}[] = [];

const adminEndpoint = (nsp: string, on: string, callback: Function) => {
  endpoints.push({ nsp, on, callback, type: 'admin' });
};
const viewerEndpoint = (nsp: string, on: string, callback: Function) => {
  endpoints.push({ nsp, on, callback, type: 'viewer' });
};
const publicEndpoint = (nsp: string, on: string, callback: Function) => {
  endpoints.push({ nsp, on, callback, type: 'public' });
};

export { endpoints, adminEndpoint, viewerEndpoint, publicEndpoint }