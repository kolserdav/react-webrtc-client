/* eslint-disable no-shadow */
const LOG_PREFIX = "PeerJS: ";

/*
Prints log messages depending on the debug level passed in. Defaults to 0.
0  Prints no logs.
1  Prints only errors.
2  Prints errors and warnings.
3  Prints all logs.
*/
export enum LogLevel {
	Disabled,
	Errors,
	Warnings,
	All,
}

class Logger {
	private _logLevel = LogLevel.Disabled;

	get logLevel(): LogLevel {
		return this._logLevel;
	}

	set logLevel(logLevel: LogLevel) {
		this._logLevel = logLevel;
	}

	log(...args: any[]) {
		if (this._logLevel >= LogLevel.All) {
			this._print(LogLevel.All, ...args);
		}
	}

	warn(...args: any[]) {
		if (this._logLevel >= LogLevel.Warnings) {
			this._print(LogLevel.Warnings, ...args);
		}
	}

	error(...args: any[]) {
		if (this._logLevel >= LogLevel.Errors) {
			this._print(LogLevel.Errors, ...args);
		}
	}

	setLogFunction(fn: (logLevel: LogLevel, ..._: any[]) => void): void {
		this._print = fn;
	}

	// eslint-disable-next-line class-methods-use-this
	private _print(logLevel: LogLevel, ...rest: any[]): void {
		const copy = [LOG_PREFIX, ...rest];

		for (const i in copy) {
			if (copy[i] instanceof Error) {
				// eslint-disable-next-line prefer-template
				copy[i] = "(" + copy[i].name + ") " + copy[i].message;
			}
		}

		if (logLevel >= LogLevel.All) {
			console.log(...copy);
		} else if (logLevel >= LogLevel.Warnings) {
			console.warn("WARNING", ...copy);
		} else if (logLevel >= LogLevel.Errors) {
			console.error("ERROR", ...copy);
		}
	}
}

export default new Logger();
