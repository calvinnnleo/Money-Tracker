const sessions = new Map();

export function getSession(userId) {
  const idStr = String(userId);
  if (!sessions.has(idStr)) {
    sessions.set(idStr, {
      mode: "idle",
      tempData: null,
    });
  }
  return sessions.get(idStr);
}

export function setSession(userId, state) {
  sessions.set(String(userId), state);
}

export function clearSession(userId) {
  sessions.delete(String(userId));
}
