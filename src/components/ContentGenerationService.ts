// Content Generation Service
import { ContentGenerationConfig, GeneratedContent } from '../types';
import { validateConfig } from '../utils';
import { LocalStorageService } from '../utils/LocalStorageService';
import { HistoryService } from '../utils/HistoryService';
import { LLMConfig } from '../utils/RealLLMService';
import { RealLLMService } from '../utils/RealLLMService';
import { SearchService } from '../utils/SearchService';
import { EnhancedWorkflowOrchestrator } from '../agents/EnhancedWorkflowOrchestrator';
import { TaskManagerService } from '../services/TaskManagerService';
import { TaskRunner } from '../services/TaskRunner';

export class ContentGenerationService {
  private orchestrator: EnhancedWorkflowOrchestrator;

  constructor(llmConfig?: LLMConfig) {
    const llmService = new RealLLMService(llmConfig);
    const searchService = new SearchService(llmService);
    this.orchestrator = new EnhancedWorkflowOrchestrator(llmService, searchService);
  }

  // Method to create a new task
  createTask(config: ContentGenerationConfig) {
    const taskManager = TaskManagerService.getInstance();
    return taskManager.createTask(config);
  }

  // Method to run a specific task
  async runTask(taskId: string, config: ContentGenerationConfig): Promise<GeneratedContent> {
    const runner = new TaskRunner(taskId);
    const content = await runner.runTask(config);
    
    // Save to local storage - using AI-generated title instead of user input
    LocalStorageService.saveGeneratedContent(content);
    LocalStorageService.saveGenerationHistory(content.title, content.id); // Use AI-generated title
    
    // Save to history folder - organize by original query/topic
    await HistoryService.saveToHistory(content, config.topic);

    // Save knowledge base entries
    for (const entry of content.knowledgeBase) {
      LocalStorageService.saveKnowledgeBaseEntry(entry);
    }
    
    return content;
  }

  // Original generateContent method but now using tasks
  async generateContent(config: ContentGenerationConfig): Promise<GeneratedContent> {
    // Create a task for this generation with the keyword extraction setting
    const task = this.createTask({
      ...config,
      enableKeywordExtraction: config.enableKeywordExtraction ?? true
    });
    
    // Run the task
    const content = await this.runTask(task.id, {
      ...config,
      enableKeywordExtraction: config.enableKeywordExtraction ?? true
    });
    
    return content;
  }

  async expandTermDetails(term: string, context: string, content: string) {
    // This would require additional implementation
    return {
      definition: `Detailed definition of ${term}`,
      explanation: `Explanation of ${term} in context: ${context}`,
      examples: [`Example 1 of ${term}`, `Example 2 of ${term}`],
      relatedTerms: []
    };
  }
}