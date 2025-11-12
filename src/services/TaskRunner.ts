// Task Runner for the knowledge content generation application
import { ContentGenerationConfig, GeneratedContent } from '../types';
import { TaskManagerService } from '../services/TaskManagerService';
import { EnhancedWorkflowOrchestrator } from '../agents/EnhancedWorkflowOrchestrator';
import { RealLLMService } from '../utils/RealLLMService';
import { SearchService } from '../utils/SearchService';
import { TaskContext } from '../utils/TaskContext';

export class TaskRunner {
  private taskManager: TaskManagerService;
  private orchestrator: EnhancedWorkflowOrchestrator;
  private taskId: string;

  constructor(taskId: string) {
    this.taskId = taskId;
    this.taskManager = TaskManagerService.getInstance();
    
    // Initialize services for this specific task
    const llmService = new RealLLMService();
    const searchService = new SearchService(llmService);
    this.orchestrator = new EnhancedWorkflowOrchestrator(llmService, searchService);
  }

  async runTask(config: ContentGenerationConfig): Promise<GeneratedContent> {
    const task = this.taskManager.getTask(this.taskId);
    if (!task) {
      throw new Error(`Task ${this.taskId} not found`);
    }

    try {
      // Set the task context so that all prompts during this task are associated with it
      TaskContext.setCurrentTask(this.taskId);

      // Update task status to running
      this.taskManager.updateTask(this.taskId, {
        status: 'running',
        startedAt: Date.now()
      });
      
      this.taskManager.updateTaskProgress(this.taskId, {
        step: 'Started',
        current: 0,
        total: 100,
        status: 'in-progress',
        details: 'Task started'
      });

      // Run the content generation workflow
      const content = await this.orchestrator.executeFullWorkflow(
        config.topic,
        config.enableKeywordExtraction ?? true
      );

      // Update task with the generated content
      this.taskManager.updateTask(this.taskId, {
        currentContent: content,
        status: 'completed',
        completedAt: Date.now()
      });
      
      this.taskManager.updateTaskProgress(this.taskId, {
        step: 'Completed',
        current: 100,
        total: 100,
        status: 'completed',
        details: 'Task completed successfully'
      });

      return content;
    } catch (error) {
      // Update task with failure status
      this.taskManager.updateTask(this.taskId, {
        status: 'failed'
      });
      
      this.taskManager.updateTaskProgress(this.taskId, {
        step: 'Error',
        current: 100,
        total: 100,
        status: 'failed',
        details: error instanceof Error ? error.message : String(error)
      });

      throw error;
    } finally {
      // Always clear the task context after execution
      TaskContext.setCurrentTask(null);
    }
  }
}