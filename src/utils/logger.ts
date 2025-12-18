type LogLevel = 'info' | 'warn' | 'error' | 'success';

interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  level: LogLevel;
}

class LoggerService {
  private listeners: ((entry: LogEntry) => void)[] = [];

  log(message: string, level: LogLevel = 'info') {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      message,
      level,
    };
    this.listeners.forEach(l => l(entry));
    console.log(`[SYNES][${level.toUpperCase()}] ${message}`); 
  }

  subscribe(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const logger = new LoggerService();
