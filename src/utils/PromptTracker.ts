// Prompt Tracking Service
import { generateId } from '../utils';

export interface PromptRecord {
  id: string;
  taskId?: string; // Added to associate with specific tasks
  prompt: string;
  timestamp: number;
  model?: string;
  response?: string;
  status?: 'success' | 'error' | 'timeout' | 'pending'; // Status of the prompt execution
  metadata?: Record<string, any>;
}

const PROMPT_HISTORY_KEY = 'prompt_history';

export class PromptTracker {
  // Save a prompt to history
  static savePrompt(prompt: string, metadata?: Record<string, any>, taskId?: string): string {
    const record: PromptRecord = {
      id: generateId(),
      taskId, // Associate with specific task if provided
      prompt,
      timestamp: Date.now(),
      metadata
    };

    try {
      const history = this.getPromptHistory();
      const updatedHistory = [...history, record];
      
      // Keep only the last 1000 prompts to avoid storage overflow
      if (updatedHistory.length > 1000) {
        updatedHistory.shift();
      }
      
      localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(updatedHistory));
      return record.id;
    } catch (error) {
      console.error('Error saving prompt to history:', error);
      return record.id;
    }
  }

  // Get all prompts from history
  static getPromptHistory(): PromptRecord[] {
    try {
      const historyStr = localStorage.getItem(PROMPT_HISTORY_KEY);
      if (!historyStr) {
        return [];
      }
      return JSON.parse(historyStr);
    } catch (error) {
      console.error('Error loading prompt history:', error);
      return [];
    }
  }

  // Get a specific prompt by ID
  static getPromptById(id: string): PromptRecord | undefined {
    const history = this.getPromptHistory();
    return history.find(record => record.id === id);
  }

  // Update a prompt record with response and other data
  static updatePrompt(id: string, updates: Partial<PromptRecord>): void {
    try {
      const history = this.getPromptHistory();
      const index = history.findIndex(record => record.id === id);
      
      if (index !== -1) {
        history[index] = { ...history[index], ...updates };
        localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(history));
      }
    } catch (error) {
      console.error('Error updating prompt in history:', error);
    }
  }

  // Clear prompt history
  static clearPromptHistory(): void {
    try {
      localStorage.removeItem(PROMPT_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing prompt history:', error);
    }
  }

  // Initialize prompt history storage
  static initialize(): void {
    if (!localStorage.getItem(PROMPT_HISTORY_KEY)) {
      localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify([]));
    }
  }
}

// Initialize when the module is loaded
PromptTracker.initialize();