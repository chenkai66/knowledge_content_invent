// Chunked Content Generation Service
// Handles generating long content by making multiple API calls within token limits
import { RealLLMService, LLMCallOptions } from './RealLLMService';
import { logger } from './Logger';

export class ChunkedContentGenerator {
  private llmService: RealLLMService;

  constructor(llmService: RealLLMService) {
    this.llmService = llmService;
  }

  async generateLongContent(prompt: string, desiredWordCount: number, options: LLMCallOptions = {}): Promise<string> {
    logger.info('chunked-content-generator', `Generating long content with target word count: ${desiredWordCount}`);
    
    // Calculate rough tokens per call based on API limits
    const maxTokensPerCall = 6000; // Keep below API limit with buffer
    
    // Estimate content per call (typically ~75% of max tokens become meaningful content)
    const estimatedWordsPerCall = Math.floor(maxTokensPerCall * 0.75);
    
    // Calculate number of chunks needed
    const chunksNeeded = Math.ceil(desiredWordCount / estimatedWordsPerCall);
    
    logger.info('chunked-content-generator', `Splitting content into ${chunksNeeded} chunks`);
    
    let fullContent = '';
    
    for (let i = 0; i < chunksNeeded; i++) {
      logger.info('chunked-content-generator', `Generating chunk ${i + 1}/${chunksNeeded}`);
      
      // Create a specific prompt for this chunk
      const chunkPrompt = this.createChunkPrompt(prompt, fullContent, i, chunksNeeded);
      
      try {
        // Generate this chunk of content
        const chunk = await this.llmService.callLLM(chunkPrompt, {
          ...options,
          maxTokens: maxTokensPerCall
        });
        
        fullContent += chunk + ' ';
        
        // Brief pause to be respectful to the API
        await this.delay(1000);
      } catch (error) {
        logger.error('chunked-content-generator', `Error generating chunk ${i + 1}: ${error}`);
        throw error;
      }
    }
    
    logger.info('chunked-content-generator', `Generated content with total length: ${fullContent.length} characters`);
    return fullContent.trim();
  }

  private createChunkPrompt(originalPrompt: string, existingContent: string, chunkIndex: number, totalChunks: number): string {
    let prompt = `Based on the main topic: "${originalPrompt}"\n\n`;
    
    if (existingContent) {
      prompt += `Previous content:\n${existingContent.substring(0, 1000)}...\n\n`;
    }
    
    prompt += `Generate detailed content for part ${chunkIndex + 1} of ${totalChunks} for the topic "${originalPrompt}". `;
    prompt += `Continue logically from any previous content. `;
    prompt += `Ensure this part covers significant aspects of the topic in detail. `;
    prompt += `Keep the writing style consistent with academic or educational content. `;
    prompt += `Focus on providing comprehensive information with examples where relevant.`;
    
    return prompt;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}