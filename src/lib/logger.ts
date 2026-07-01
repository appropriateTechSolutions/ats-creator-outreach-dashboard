/**
 * Thin logging wrapper.
 *
 * In development every level passes through to the console. In production the
 * chatty levels are suppressed and `error` is the hook where we will forward to
 * an observability sink (Sentry) in Phase 7. Import this instead of calling
 * `console.*` directly so we have a single choke point to control prod noise.
 */
const isDev = import.meta.env.DEV;

type LogArgs = unknown[];

export const logger = {
  debug: (...args: LogArgs) => {
    if (isDev) console.debug(...args);
  },
  info: (...args: LogArgs) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: LogArgs) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: LogArgs) => {
    if (isDev) console.error(...args);
    // Phase 7: forward to observability (e.g. Sentry.captureException) here.
  },
};
