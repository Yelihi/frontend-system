export interface Session {
  token(): string;
  replace(token: string): void;
  expire(): void;
}
export function createSession(initial: string, onExpired: () => void): Session {
  let current = initial;
  return {
    token: () => current,
    replace: next => { current = next; },
    expire: () => { current = ''; onExpired(); },
  };
}
