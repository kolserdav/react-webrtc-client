/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

const isDev = process.env.NODE_ENV !== 'production';

const Console = {
  log: (line: number, ...args: any) => {
    if (isDev) {
      console.log(line, ...args);
    }
  },
  info: (type: 'Event', ...args: any) => {
    console.info(type, ...args);
  },
  warn: (type: string, ...args: any) => {
    if (isDev) {
      console.warn(type, ...args);
    }
  },
  error: (type: string, ...args: any) => {
    if (isDev) {
      console.error(type, ...args);
    }
  },
};

export default Console;
