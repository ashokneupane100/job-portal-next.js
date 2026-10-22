/**
 * How long a session stays valid, in seconds (30 days).
 * Used both as the cookie `maxAge` and as the lifetime of the `sessions` row.
 */
export const SESSION_LIFETIME = 30 * 24 * 60 * 60;

/**
 * Refresh the session when fewer than this many seconds are left (1 day).
 * Keeps active users logged in without making sessions immortal.
 */
export const SESSION_REFRESH_TIME = 24 * 60 * 60;

/** Name of the cookie that holds the (hashed-on-save) session token. */
export const SESSION_COOKIE_NAME = "session";
