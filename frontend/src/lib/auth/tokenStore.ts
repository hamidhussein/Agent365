const SESSION_KEY = 'auth_token_session';

const readSessionToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
};

let authToken: string | null = readSessionToken();

export const getAuthToken = () => authToken;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Ignore storage errors; in-memory token still works for current session.
  }
};

export const clearAuthToken = () => {
  setAuthToken(null);
};
