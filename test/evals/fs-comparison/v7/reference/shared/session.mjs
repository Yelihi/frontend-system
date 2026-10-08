export function createSession(initialToken = null) {
  let token = initialToken;
  let epoch = 0;
  return {
    capture() { return {token, epoch}; },
    isCurrent(ticket) { return ticket.epoch === epoch; },
    setToken(value) { token = value; epoch += 1; },
  };
}
