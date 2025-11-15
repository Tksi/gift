import type { InMemoryGameStore } from 'states/inMemoryGameStore.js';

export type SessionRouteDependencies = {
  store: InMemoryGameStore;
  now: () => string;
  generateSessionId: () => string;
};
