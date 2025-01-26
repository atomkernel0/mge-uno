const COLORS = {
  RESET: "\x1b[0m",
  DEBUG: "\x1b[36m",
  INFO: "\x1b[34m",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
  FATAL: "\x1b[35m",
  BOLD: "\x1b[1m",
  DIM: "\x1b[2m",
  ITALIC: "\x1b[3m",
  UNDERLINE: "\x1b[4m",
} as const;

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

export interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  public fatal(message: string, data?: unknown): void {
    this.log(LogLevel.FATAL, message, data);
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (this.shouldLog(level)) {
      const logMessage: LogMessage = {
        level,
        message,
        timestamp: new Date().toISOString(),
        data,
      };

      this.writeToConsole(logMessage);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private writeToConsole(logMessage: LogMessage): void {
    const color = COLORS[logMessage.level];
    const timestamp = `${COLORS.DIM}[${logMessage.timestamp}]${COLORS.RESET}`;
    const levelDisplay = `${color}${COLORS.BOLD}${logMessage.level}${COLORS.RESET}`;
    const baseMessage = `${timestamp} ${levelDisplay}: ${color}${logMessage.message}${COLORS.RESET}`;

    if (logMessage.data) {
      const dataString =
        typeof logMessage.data === "object"
          ? JSON.stringify(logMessage.data, null, 2)
          : logMessage.data.toString();

      console.log(
        `${baseMessage}\n${COLORS.DIM}Data: ${dataString}${COLORS.RESET}`
      );
    } else {
      console.log(baseMessage);
    }
  }
}

export const logger = Logger.getInstance();
