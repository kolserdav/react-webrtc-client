/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

const logLevel = 3;

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
