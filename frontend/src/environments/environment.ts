export const environment = {
  production: false,
  apiUrl: '/api/v1',
  wsUrl: (typeof window !== 'undefined' ? `ws://${window.location.host}/api/v1` : '')
};
