// Simple in-memory session manager for tracking user states across inline menus

const sessions = new Map();

export function getSession(userId) {
  const idStr = String(userId);
  if (!sessions.has(idStr)) {
    sessions.set(idStr, {
      mode: "idle",       // 'idle', 'awaiting_custom_expense', 'awaiting_custom_income', 'awaiting_custom_budget', 'awaiting_time'
      tempData: null,     // holds temp data like category during prompt transitions
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
