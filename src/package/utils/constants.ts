export const DEFAULT_PARAMS = {
  width: 400,
  height: 300,
};

export const RENDER_DELAY = 500;
export const isProd = process.env.NODE_ENV === 'production';
export const isRoom = window.location.search === '?room=1';
export const SESSION_STORAGE_USER_ID = 'call-usr-id';
export const SESSION_STORAGE_USERS = 'call-users-room';
export const PROD_DEBUG_LEVEL = 3;
export const DEV_DEBUG_LEVEL = 2;
