// Comprehensive logging system for the knowledge content generation application
import { GenerationProgress } from '../types';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'debug';
  module: string;
  message: string;
  details?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000; // Keep only the last 1000 logs

  constructor() {
    // Initialize with some basic logs
    this.log('info', 'logger', 'Logging system initialized');
  }

  log(
    level: 'info' | 'warning' | 'error' | 'debug',
    module: string,
    message: string,
    details?: any
  ): void {
    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      module,
      message,
      details
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console
    this.outputToConsole(logEntry);
  }

  info(module: string, message: string, details?: any): void {
    this.log('info', module, message, details);
  }

  warning(module: string, message: string, details?: any): void {
    this.log('warning', module, message, details);
  }

  error(module: string, message: string, details?: any): void {
    this.log('error', module, message, details);
  }

  debug(module: string, message: string, details?: any): void {
    this.log('debug', module, message, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs]; // Return a copy
  }

  getLogsByLevel(level: 'info' | 'warning' | 'error' | 'debug'): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogsByModule(module: string): LogEntry[] {
    return this.logs.filter(log => log.module === module);
  }

  clearLogs(): void {
    this.logs = [];
    this.info('logger', 'Logs cleared');
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private outputToConsole(entry: LogEntry): void {
    const formattedTime = new Date(entry.timestamp).toLocaleString();
    const prefix = `[${formattedTime}] [${entry.module}]`;
    
    // Create a colorful and informative console output
    let style = '';
    let icon = '';
    
    switch (entry.level) {
      case 'info':
        style = 'color: #2ecc71; font-weight: bold;';
        icon = 'ℹ️';
        break;
      case 'warning':
        style = 'color: #f39c12; font-weight: bold;';
        icon = '⚠️';
        break;
      case 'error':
        style = 'color: #e74c3c; font-weight: bold;';
        icon = '❌';
        break;
      case 'debug':
        style = 'color: #3498db; font-weight: bold;';
        icon = '🔍';
        break;
    }
    
    // Group related information
    console.groupCollapsed(`%c${icon} ${prefix} %c${entry.message}`, 
                           style, 
                           'color: inherit; font-weight: normal;');
    
    if (entry.details) {
      console.log('%cDetails:', 'font-weight: bold; color: #7f8c8d;', entry.details);
    }
    
    console.groupEnd();
  }
}

// Global logger instance
export const logger = new Logger();

// Progress tracker
export class ProgressTracker {
  private progressSteps: GenerationProgress[] = [];
  private currentStep = 0;
  private totalSteps = 0;

  startTracking(totalSteps: number, initialStepName: string): void {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.progressSteps = [{
      step: initialStepName,
      current: 0,
      total: totalSteps,
      status: 'in-progress'
    }];
    
    logger.info('progress', `Starting process with ${totalSteps} steps`);
  }

  updateProgress(stepName: string, details?: string): void {
    this.currentStep = Math.min(this.currentStep + 1, this.totalSteps);
    
    const progress: GenerationProgress = {
      step: stepName,
      current: this.currentStep,
      total: this.totalSteps,
      status: this.currentStep === this.totalSteps ? 'completed' : 'in-progress',
      details
    };
    
    this.progressSteps.push(progress);
    
    logger.info(
      'progress', 
      `Step ${this.currentStep}/${this.totalSteps}: ${stepName}`, 
      { details, status: progress.status }
    );
  }

  getProgress(): GenerationProgress[] {
    return [...this.progressSteps];
  }

  getOverallProgress(): number {
    if (this.totalSteps === 0) return 0;
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  reset(): void {
    this.progressSteps = [];
    this.currentStep = 0;
    this.totalSteps = 0;
    logger.info('progress', 'Progress tracker reset');
  }
}

// Global progress tracker instance
export const progressTracker = new ProgressTracker();

// Real-time logging support
class RealTimeLogger {
  private listeners: Array<(entry: LogEntry) => void> = [];
  
  addListener(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  logRealTime(entry: LogEntry) {
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Error in real-time log listener:', error);
      }
    });
  }
}

export const realTimeLogger = new RealTimeLogger();