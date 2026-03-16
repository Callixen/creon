/**
 * Structured logger
 * Consistent prefixed output across relay modules
 * Supports log levels: debug, info, warn, error
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const ENV_LEVEL = process.env.LOG_LEVEL?.toLowerCase() || 'info';
const MIN_LEVEL = LEVELS[ENV_LEVEL] ?? 1;

const COLOURS = {
  debug: '\x1b[36m',  // cyan
  info:  '\x1b[32m',  // green
  warn:  '\x1b[33m',  // yellow
  error: '\x1b[31m',  // red
  reset: '\x1b[0m',
};

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level, module, ...args) {
  if (LEVELS[level] < MIN_LEVEL) return;
  const colour = COLOURS[level] || '';
  const reset = COLOURS.reset;
  const prefix = `${colour}[${ts()}] [${level.toUpperCase()}] [${module}]${reset}`;
  if (level === 'error') {
    console.error(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

export function createLogger(module) {
  return {
    debug: (...args) => log('debug', module, ...args),
    info:  (...args) => log('info',  module, ...args),
    warn:  (...args) => log('warn',  module, ...args),
    error: (...args) => log('error', module, ...args),
  };
}

// Default relay logger
export const logger = createLogger('relay');
