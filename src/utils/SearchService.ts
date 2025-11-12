// Search Service using real LLM for search capabilities
import { RealLLMService } from './RealLLMService';
import { logger } from './Logger';

export interface SearchOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class SearchService {
  private llmService: RealLLMService;

  constructor(llmService: RealLLMService) {
    this.llmService = llmService;
  }

  async search(topic: string, context?: string, options: SearchOptions = {}): Promise<string[]> {
    logger.info('search-service', `Searching for topic: ${topic}`, { context });
    
    const searchPrompt = `
      请为 "${topic}" 这个主题进行全面搜索和信息搜集，要求非常深入和专业，但也要让小白能看得懂。
      
      ${context ? `相关上下文: ${context}` : ''}
      
      请提供以下信息，要求深入详细：
      1. 该主题的精确定义和核心概念，包含技术细节
      2. 相关的重要知识点、子主题和技术分支
      3. 该主题的具体应用场景、实际案例和实施方法
      4. 相关的背景知识、前置知识和理论基础
      5. 发展历程、现状和未来趋势
      6. 优势、挑战和解决方案
      7. 关键技术参数、标准和规范
      8. 与其他技术的关联和区别
      
      请以JSON格式返回结果，格式如下：
      {
        "concepts": ["概念1", "概念2", ...],
        "subtopics": ["子主题1", "子主题2", ...],
        "applications": ["应用场景1", "应用场景2", ...],
        "background": ["背景知识1", "背景知识2", ...],
        "trends": ["发展趋势1", "发展趋势2", ...],
        "challenges": ["挑战1", "挑战2", ...],
        "solutions": ["解决方案1", "解决方案2", ...]
      }
    `;
    
    try {
      // Use higher token count for more comprehensive results
      const result = await this.llmService.callLLM(searchPrompt, {
        model: options.model || 'qwen-max-latest',
        maxTokens: options.maxTokens || 4000,  // Increased for comprehensive results
        temperature: options.temperature || 0.5  // Lower for more focused results
      });
      
      // Try to parse the result as JSON
      try {
        const parsedResult = JSON.parse(result);
        const allResults = [
          ...(parsedResult.concepts || []),
          ...(parsedResult.subtopics || []),
          ...(parsedResult.applications || []),
          ...(parsedResult.background || []),
          ...(parsedResult.trends || []),
          ...(parsedResult.challenges || []),
          ...(parsedResult.solutions || [])
        ];
        
        logger.info('search-service', `Search completed for topic: ${topic}`, { resultsCount: allResults.length });
        return allResults;
      } catch (parseError) {
        // If parsing fails, split the result by newlines as a fallback
        logger.warning('search-service', `Failed to parse search result as JSON, using fallback`, { error: parseError });
        return result.split('\n').filter(item => item.trim() !== '');
      }
    } catch (error) {
      logger.error('search-service', `Search failed for topic: ${topic}`, { error: (error as Error).message });
      throw error;
    }
  }
}