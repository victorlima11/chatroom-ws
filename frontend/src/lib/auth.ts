export type AuthUser = {
  id: string;
  name: string;
  email: string;
  profile_pic?: string | null;
  created_at?: string;
};

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const CHAT_NAME_KEY = 'chat_name';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getChatName() {
  return localStorage.getItem(CHAT_NAME_KEY);
}

export function setChatName(name: string) {
  localStorage.setItem(CHAT_NAME_KEY, name);
}
