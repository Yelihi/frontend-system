import type { Transport } from './types';
// Existing seam used by both screens and the deployment's HTTP adapter.
export const browserTransport: Transport = (input, init) => fetch(input, init);
