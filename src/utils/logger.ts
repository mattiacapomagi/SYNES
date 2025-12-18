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
    
    // Advanced Console Logging
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[SYNES ${timestamp}]`;
    const style = level === 'error' ? 'color: #ff0000; font-weight: bold;' : 
                  level === 'success' ? 'color: #00ff00; font-weight: bold;' : 
                  level === 'warn' ? 'color: #ffa500;' : 'color: #00aaff;';
    
    console.log(`%c${prefix} ${message}`, style);
    
    // Mirror to window for remote debugging if needed
    // @ts-ignore
    if (!window.__SYNES_LOGS__) window.__SYNES_LOGS__ = [];
    // @ts-ignore
    window.__SYNES_LOGS__.push(entry);
  }

  subscribe(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const logger = new LoggerService();
