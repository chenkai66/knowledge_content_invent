// Task model for the knowledge content generation application
import { GeneratedContent } from './types';

export interface TaskPromptRecord {
  id: string;
  taskId: string;
  prompt: string;
  response?: string;
  timestamp: number;
  model?: string;
  metadata?: Record<string, any>;
}

export interface TaskProgress {
  step: string;
  current: number;
  total: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  details?: string;
}

export interface Task {
  id: string;
  topic: string;
  status: 'created' | 'running' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  currentContent?: GeneratedContent;
  progress: TaskProgress[];
  promptHistory: TaskPromptRecord[];
  generationConfig: any; // ContentGenerationConfig without method specifics
}

export interface TaskState {
  [taskId: string]: Task;
}