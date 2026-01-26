/**
 * Logger utility for React Native application
 * Provides structured logging with different levels and context support
 * 
 * Logging behavior:
 * - Dev mode: Logs all levels (DEBUG, INFO, WARN, ERROR)
 * - Production: Only logs WARN and ERROR levels (DEBUG and INFO are disabled)
 * 
 * Note: WARN and ERROR are always logged regardless of environment.
 *       DEBUG and INFO only work in dev mode.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

type LogData = any;

interface LoggerConfig {
  level: LogLevel;
  enableTimestamp: boolean;
  enableContext: boolean;
  enableColors: boolean;
}

class Logger {
  private config: LoggerConfig = {
    level: __DEV__ ? LogLevel.DEBUG : LogLevel.WARN,
    enableTimestamp: true,
    enableContext: true,
    enableColors: __DEV__,
  };

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Configure logger settings
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatTimestamp(): string {
    if (!this.config.enableTimestamp) return '';
    const now = new Date();
    return `[${now.toISOString()}]`;
  }

  private formatContext(context?: string): string {
    if (!this.config.enableContext || !context) return '';
    return `[${context}]`;
  }

  private formatMessage(level: string, context?: string, emoji?: string): string {
    const parts: string[] = [];
    
    if (this.config.enableTimestamp) {
      parts.push(this.formatTimestamp());
    }
    
    if (emoji) {
      parts.push(emoji);
    }
    
    if (context) {
      parts.push(this.formatContext(context));
    }
    
    parts.push(level);
    
    return parts.filter(Boolean).join(' ');
  }

  /**
   * Log debug message
   * Only logs in dev mode. In production, this is a no-op.
   */
  debug(message: string, data?: LogData, context?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const formatted = this.formatMessage('DEBUG', context, '🔍');
    if (data !== undefined) {
      console.log(formatted, message, data);
    } else {
      console.log(formatted, message);
    }
  }

  /**
   * Log info message
   * Only logs in dev mode. In production, this is a no-op.
   */
  info(message: string, data?: LogData, context?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const formatted = this.formatMessage('INFO', context, '🔹');
    if (data !== undefined) {
      console.log(formatted, message, data);
    } else {
      console.log(formatted, message);
    }
  }

  /**
   * Log warning message
   * Always logs in both dev and production modes.
   */
  warn(message: string, data?: LogData, context?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const formatted = this.formatMessage('WARN', context, '⚠️');
    if (data !== undefined) {
      console.warn(formatted, message, data);
    } else {
      console.warn(formatted, message);
    }
  }

  /**
   * Log error message
   * Always logs in both dev and production modes.
   */
  error(message: string, error?: Error | LogData, context?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const formatted = this.formatMessage('ERROR', context, '❌');
    
    if (error instanceof Error) {
      console.error(formatted, message, {
        message: error.message,
        stack: error.stack,
        ...(error as any),
      });
    } else if (error !== undefined) {
      console.error(formatted, message, error);
    } else {
      console.error(formatted, message);
    }
  }

  /**
   * Create a scoped logger with a default context
   */
  createScoped(context: string): ScopedLogger {
    return new ScopedLogger(this, context);
  }
}

/**
 * Scoped logger with a default context
 */
class ScopedLogger {
  constructor(
    private logger: Logger,
    private context: string
  ) {}

  debug(message: string, data?: LogData): void {
    this.logger.debug(message, data, this.context);
  }

  info(message: string, data?: LogData): void {
    this.logger.info(message, data, this.context);
  }

  warn(message: string, data?: LogData): void {
    this.logger.warn(message, data, this.context);
  }

  error(message: string, error?: Error | LogData): void {
    this.logger.error(message, error, this.context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, data?: LogData, context?: string) => logger.debug(message, data, context),
  info: (message: string, data?: LogData, context?: string) => logger.info(message, data, context),
  warn: (message: string, data?: LogData, context?: string) => logger.warn(message, data, context),
  error: (message: string, error?: Error | LogData, context?: string) => logger.error(message, error, context),
  createScoped: (context: string) => logger.createScoped(context),
};

// Export default logger instance
export default logger;
