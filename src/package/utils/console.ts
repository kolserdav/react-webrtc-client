/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isProd, PROD_DEBUG_LEVEL, DEV_DEBUG_LEVEL } from '../utils';

const _logLevel: any = isProd ? PROD_DEBUG_LEVEL : DEV_DEBUG_LEVEL;
const logLevel = parseInt(_logLevel, 10);

const Console = {
  log: (line: number, ...args: any) => {
    console.log(line, ...args);
  },
  info: (type: 'Event', ...args: any) => {
    if (logLevel >= 3) {
      console.info(type, ...args);
    }
  },
  warn: (type: string, ...args: any) => {
    if (logLevel >= 2) {
      console.warn(type, ...args);
    }
  },
  error: (type: string, ...args: any) => {
    if (logLevel >= 1) {
      console.error(type, ...args);
    }
  },
};

export default Console;
