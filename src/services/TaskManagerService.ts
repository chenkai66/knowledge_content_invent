// Task Manager Service
import { Task, TaskPromptRecord, TaskState } from '../types/TaskTypes';
import { ContentGenerationConfig, GeneratedContent } from '../types';
import { ContentGenerationService } from '../components/ContentGenerationService';
import { LocalStorageService } from './LocalStorageService';

const TASK_STORAGE_KEY = 'knowledge_tasks';
const TASK_PROMPTS_STORAGE_KEY = 'knowledge_task_prompts';

export class TaskManagerService {
  private static instance: TaskManagerService;
  private tasks: TaskState = {};
  private contentService: ContentGenerationService;
  
  private constructor() {
    this.contentService = new ContentGenerationService();
    this.loadTasksFromStorage();
  }

  static getInstance(): TaskManagerService {
    if (!TaskManagerService.instance) {
      TaskManagerService.instance = new TaskManagerService();
    }
    return TaskManagerService.instance;
  }

  // Load tasks from storage
  private loadTasksFromStorage(): void {
    try {
      const tasksStr = localStorage.getItem(TASK_STORAGE_KEY);
      if (tasksStr) {
        this.tasks = JSON.parse(tasksStr);
      }
    } catch (error) {
      console.error('Error loading tasks from storage:', error);
      this.tasks = {};
    }
  }

  // Save tasks to storage
  private saveTasksToStorage(): void {
    try {
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(this.tasks));
    } catch (error) {
      console.error('Error saving tasks to storage:', error);
    }
  }

  // Create a new task
  createTask(config: ContentGenerationConfig): Task {
    const taskId = this.generateId();
    
    const task: Task = {
      id: taskId,
      topic: config.topic,
      status: 'created',
      createdAt: Date.now(),
      progress: [],
      promptHistory: [],
      generationConfig: { ...config },
    };

    this.tasks[taskId] = task;
    this.saveTasksToStorage();
    return task;
  }

  // Start a task
  async startTask(taskId: string): Promise<void> {
    const task = this.tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'running';
    task.startedAt = Date.now();
    this.saveTasksToStorage();

    try {
      // Use the content service to generate content for this task
      const content = await this.contentService.generateContent(
        task.generationConfig as ContentGenerationConfig
      );
      
      task.currentContent = content;
      task.status = 'completed';
      task.completedAt = Date.now();
    } catch (error) {
      task.status = 'failed';
      console.error(`Task ${taskId} failed:`, error);
    }

    this.saveTasksToStorage();
  }

  // Get a specific task
  getTask(taskId: string): Task | undefined {
    return this.tasks[taskId];
  }

  // Get all tasks
  getAllTasks(): Task[] {
    return Object.values(this.tasks);
  }

  // Get tasks by status
  getTasksByStatus(status: Task['status']): Task[] {
    return Object.values(this.tasks).filter(task => task.status === status);
  }
  
  // Get tasks by status convenience methods
  getCreatedTasks(): Task[] {
    return this.getTasksByStatus('created');
  }
  
  getRunningTasks(): Task[] {
    return this.getTasksByStatus('running');
  }
  
  getCompletedTasks(): Task[] {
    return this.getTasksByStatus('completed');
  }
  
  getFailedTasks(): Task[] {
    return this.getTasksByStatus('failed');
  }

  // Delete a task
  deleteTask(taskId: string): void {
    delete this.tasks[taskId];
    this.saveTasksToStorage();
  }

  // Add a prompt record to a specific task
  addPromptToTask(taskId: string, prompt: string, response?: string): void {
    const task = this.tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const promptRecord: TaskPromptRecord = {
      id: this.generateId(),
      taskId,
      prompt,
      response,
      timestamp: Date.now(),
      model: task.generationConfig.model || 'default'
    };

    task.promptHistory.push(promptRecord);
    this.saveTasksToStorage();
  }

  // Get prompt records for a specific task
  getTaskPromptHistory(taskId: string): TaskPromptRecord[] {
    const task = this.tasks[taskId];
    return task ? task.promptHistory : [];
  }

  // Update task progress
  updateTaskProgress(taskId: string, progress: TaskProgress): void {
    const task = this.tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.progress.push(progress);
    this.saveTasksToStorage();
  }

  // Update an existing task
  updateTask(taskId: string, updates: Partial<Task>): void {
    if (!this.tasks[taskId]) {
      throw new Error(`Task ${taskId} not found`);
    }

    this.tasks[taskId] = {
      ...this.tasks[taskId],
      ...updates
    };
    this.saveTasksToStorage();
  }

  // Generate a unique ID
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Clear all tasks
  clearAll(): void {
    this.tasks = {};
    localStorage.removeItem(TASK_STORAGE_KEY);
  }
}