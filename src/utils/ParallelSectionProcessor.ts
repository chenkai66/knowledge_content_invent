// Parallel Section Processor for Content Generation
import { RealLLMService } from './RealLLMService';
import { logger } from './Logger';
import { PROMPTS } from '../prompts/prompts';

export interface SectionGenerationContext {
  overallTopic: string;
  currentSectionIndex: number;
  previousSections: string[];
  nextSections: string[];
}

export interface SectionGenerationParams {
  title: string;
  content: string;
  context: SectionGenerationContext;
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export class ParallelSectionProcessor {
  private llmService: RealLLMService;

  constructor(llmService: RealLLMService) {
    this.llmService = llmService;
  }

  async generateSections(
    topic: string,
    sectionTitles: string[],
    searchSummary: string
  ): Promise<{ [key: string]: string }> {
    logger.info('parallel-processor', `Starting parallel generation of ${sectionTitles.length} sections for topic: ${topic}`);
    
    // Prepare generation tasks with proper contexts
    const tasks = sectionTitles.map((title, index) => {
      const context: SectionGenerationContext = {
        overallTopic: topic,
        currentSectionIndex: index,
        previousSections: sectionTitles.slice(0, index),
        nextSections: sectionTitles.slice(index + 1)
      };
      
      const params: SectionGenerationParams = {
        title,
        content: searchSummary,
        context,
        options: {
          model: 'qwen-max-latest',
          temperature: 0.7,
          maxTokens: 8000
        }
      };
      
      return this.generateSingleSection(params);
    });
    
    // Execute all tasks in parallel
    try {
      const results = await Promise.all(tasks);
      
      // Combine results into an object with section titles as keys
      const resultObject: { [key: string]: string } = {};
      sectionTitles.forEach((title, index) => {
        resultObject[title] = results[index];
      });
      
      logger.info('parallel-processor', `Completed parallel generation of ${sectionTitles.length} sections`);
      return resultObject;
    } catch (error) {
      logger.error('parallel-processor', `Parallel section generation failed`, { error });
      throw error;
    }
  }

  private async generateSingleSection(params: any): Promise<string> {
    const { title, content, context, options } = params;
    
    // Create context about other sections to avoid duplication
    const previousSectionNames = (context.previousSections && context.previousSections.length > 0) ? context.previousSections.join(", ") : "None";
    const nextSectionNames = (context.nextSections && context.nextSections.length > 0) ? context.nextSections.join(", ") : "None";
    
    // Use the section generation prompt from our unified prompts
    let sectionPrompt = PROMPTS.SECTION_GENERATION_PROMPT;
    sectionPrompt = sectionPrompt.replace('{sectionTitle}', title);
    sectionPrompt = sectionPrompt.replace('{topic}', context.overallTopic);
    sectionPrompt = sectionPrompt.replace('{searchSummary}', content);
    sectionPrompt = sectionPrompt.replace('{previousSections}', previousSectionNames);
    sectionPrompt = sectionPrompt.replace('{nextSections}', nextSectionNames);
    
    try {
      const result = await this.llmService.callLLM(sectionPrompt, {
        model: options?.model || 'qwen-max-latest',
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 8000
      });
      
      logger.info('parallel-processor', `Generated section: ${title}`);
      return result;
    } catch (error) {
      logger.error('parallel-processor', `Failed to generate section: ${title}`, { error });
      // Return a fallback if generation fails
      return `Section "${title}" content generation failed. This section would contain information related to "${context.overallTopic}" and the specific topic "${title}".`;
    }
  }
}