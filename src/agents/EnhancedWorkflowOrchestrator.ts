// Enhanced workflow orchestrator for the knowledge content generation application
import { ContentGenerationConfig, GeneratedContent, GenerationProgress } from '../types';
import { logger, progressTracker } from '../utils/Logger';
import { PromptTracker } from '../utils/PromptTracker';
import { RealLLMService } from '../utils/RealLLMService';
import { SearchService } from '../utils/SearchService';
import { LocalStorageService } from '../utils/LocalStorageService';
import { PROMPTS } from '../prompts/prompts';
import { ParallelSectionProcessor } from '../utils/ParallelSectionProcessor';
import { TaskContext } from '../utils/TaskContext';

export interface SearchResult {
  id: string;
  query: string;
  results: any[];
  timestamp: number;
  sourceUrls: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
  details?: string;
}

export class EnhancedWorkflowOrchestrator {
  private llmService: RealLLMService;
  private searchService: SearchService;

  constructor(llmService: RealLLMService, searchService: SearchService) {
    this.llmService = llmService;
    this.searchService = searchService;
  }

  async executeFullWorkflow(userInput: string, enableKeywordExtraction: boolean = true): Promise<GeneratedContent> {
    // Set the query context with timestamp before any LLM calls happen
    const workflowTimestamp = Date.now();
    const timestampStr = new Date(workflowTimestamp).toISOString().replace(/[-:]/g, '').replace(/\..+/, '').substring(2);
    const queryWithTimestamp = userInput ? `${this.sanitizeFileName(userInput)}-${timestampStr}` : `untitled-${timestampStr}`;
    TaskContext.setCurrentQueryWithTimestamp(queryWithTimestamp);
    
    logger.info('workflow-orchestrator', `Starting enhanced workflow for input: ${userInput.substring(0, 100)}...`);
    // Increase the total steps to allow for more granular progress tracking
    // The actual workflow is much more complex than the initial estimate of 6 steps
    progressTracker.startTracking(100, 'Initializing workflow');

    // Step 1: Rewrite the user prompt (1-5%)
    progressTracker.updateProgress('Rewriting user prompt', 'Improving clarity and specificity');
    const rewriteResult = await this.rewritePrompt(userInput);
    const rewrittenPrompt = rewriteResult.rewrittenPrompt;
    
    // Step 2: Generate search plan (6-10%)
    progressTracker.updateProgress('Generating search plan', 'Creating multi-agent search strategy');
    const searchPlan = await this.generateSearchPlan(rewrittenPrompt);
    
    // Step 3: Execute searches (11-25%)
    progressTracker.updateProgress('Executing searches', `Performing ${searchPlan.queries.length} searches`);
    const searchResults = await this.executeSearches(searchPlan.queries);
    
    // Step 4: Summarize search results (26-30%)
    progressTracker.updateProgress('Summarizing search results', 'Analyzing and consolidating information');
    const searchSummary = await this.summarizeSearchResults(searchResults);
    
    // Step 5: Generate comprehensive content (31-70%)
    progressTracker.updateProgress('Generating comprehensive content', 'Creating detailed content with multiple LLM calls (this may take a while)');
    const mainContent = await this.generateComprehensiveContent(rewrittenPrompt, searchSummary);
    
    // Finalize content (skip validation step as requested)
    progressTracker.updateProgress('Finalizing content', 'Combining content and knowledge base');
    const finalContent = mainContent; // Skipping validation step
    
    // Create the final content structure
    const contentId = this.generateId();
    const timestamp = Date.now();
    
    // Create content nodes (76-80%)
    progressTracker.updateProgress('Creating content structure', 'Building tree structure and nodes');
    const contentNodes = this.createContentNodes(rewrittenPrompt, finalContent);
    
    // Generate knowledge base (81-100%) based on enableKeywordExtraction setting
    let knowledgeBase = [];
    if (enableKeywordExtraction) {
      progressTracker.updateProgress('Generating knowledge base', 'Extracting and explaining complex concepts (this may take a while)');
      knowledgeBase = await this.generateKnowledgeBase(rewrittenPrompt, finalContent);
    } else {
      progressTracker.updateProgress('Skipping knowledge base', 'Keyword extraction is disabled');
    }
    
    // Use the title from the rewrite result instead of extracting from content
    const extractedTitle = rewriteResult.title;
    
    // Combine main content with knowledge base (keyword cards) to form complete output
    let completeContent = finalContent;
    
    // Append knowledge base entries to the main content if any exist
    if (knowledgeBase && knowledgeBase.length > 0) {
      completeContent += '\n\n## 关键术语详解\n\n';
      
      for (const kbEntry of knowledgeBase) {
        completeContent += `### ${kbEntry.term}\n\n`;
        completeContent += `${kbEntry.definition}\n\n`;
      }
    }

    const generatedContent: GeneratedContent = {
      id: contentId,
      title: extractedTitle,  // Use the AI-generated title from the content
      mainContent: completeContent,  // Combined content with knowledge base appended
      nodes: contentNodes,
      knowledgeBase,
      timestamp,
      generationSteps: [
        `Rewrote user input to: ${rewrittenPrompt}`,
        `Generated search plan with ${searchPlan.queries.length} queries`,
        `Executed ${searchResults.length} searches`,
        `Created content with multiple LLM calls`,
        enableKeywordExtraction 
          ? `Generated knowledge base with ${knowledgeBase.length} terms`
          : `Skipped knowledge base generation (keyword extraction disabled)`
      ],
      progress: progressTracker.getProgress()
    };

    logger.info('workflow-orchestrator', `Enhanced workflow completed for input: ${userInput.substring(0, 50)}...`);
    
    // Clear the query context after workflow completion
    TaskContext.setCurrentQueryWithTimestamp(null);
    
    return generatedContent;
  }

  // Define interface for the return type
private async rewritePrompt(userInput: string): Promise<{rewrittenPrompt: string, title: string}> {
    const rewritePrompt = PROMPTS.REWRITE_PROMPT.replace('{userInput}', userInput);

    // Retry mechanism with 3 attempts
    let result = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await this.llmService.callLLM(rewritePrompt, { maxTokens: 2000 });
        
        // Parse the result to isolate the rewritten content from analysis
        // Look for content after "请提供重写后的内容：" and before any "是否需要包含..." sections
        const lines = result.split('\n');
        let startIndex = -1;
        let endIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes('请提供重写后的内容：')) {
            startIndex = i + 1; // Start after the instruction
          } else if (line.includes('是否需要包含代码示例和/或数学公式')) {
            endIndex = i; // End at the code/formula requirement
            break;
          }
        }
        
        // Extract the main content between these markers
        let cleanResult = result;
        let extractedTitle = userInput.substring(0, 50); // default fallback
        if (startIndex !== -1) {
          const contentLines = startIndex !== -1 && endIndex !== -1 
            ? lines.slice(startIndex, endIndex) 
            : lines.slice(startIndex);
          cleanResult = contentLines.join('\n').trim();
          
          // Try to extract a title from the first meaningful line
          for (const line of contentLines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) {
              extractedTitle = trimmedLine.substring(0, 100); // limit title length
              break;
            }
          }
        }
        
        // Further clean the result to remove common artifacts
        cleanResult = cleanResult.replace(/^\s*["']?(.*?)["']?\s*$/s, '$1'); // Remove quotes
        cleanResult = cleanResult.replace(/^[^a-zA-Z0-9\u4e00-\u9fa5]+/, ''); // Remove leading punctuation
        cleanResult = cleanResult.replace(/\n\s*\*\*.*?\*\*/g, '\n'); // Remove standalone bold markers
        
        if (cleanResult && cleanResult.trim()) {
          logger.info('workflow-orchestrator', `Prompt rewrite completed (attempt ${attempt + 1})`);
          
          // If no title was extracted, try to get a reasonable title from the content
          if (extractedTitle === userInput.substring(0, 50)) {
            const firstLine = cleanResult.split('\n')[0].trim();
            extractedTitle = firstLine.length <= 100 ? firstLine : userInput.substring(0, 50) + '...';
          }
          
          return {
            rewrittenPrompt: cleanResult.trim(),
            title: extractedTitle
          };
        }
      } catch (error) {
        logger.warning('workflow-orchestrator', `Prompt rewrite attempt ${attempt + 1} failed`, { error });
        if (attempt === 2) { // Last attempt
          return {
            rewrittenPrompt: userInput,
            title: userInput.substring(0, 50) // fallback
          };
        }
        // Wait before retry
        await this.delay(2000);
      }
    }
    
    return {
      rewrittenPrompt: userInput,
      title: userInput.substring(0, 50) // fallback
    };
  }

  private async generateSearchPlan(topic: string): Promise<{ queries: string[] }> {
    const searchPlanPrompt = PROMPTS.SEARCH_PLAN_PROMPT.replace('{topic}', topic);

    // Retry mechanism with 3 attempts
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await this.llmService.callLLM(searchPlanPrompt, { maxTokens: 3000 });
        const parsedResult = JSON.parse(result);
        logger.info('workflow-orchestrator', `Search plan generated with ${parsedResult.queries.length} queries (attempt ${attempt + 1})`);
        return parsedResult;
      } catch (error) {
        logger.warning('workflow-orchestrator', `Search plan generation attempt ${attempt + 1} failed`, { error });
        if (attempt === 2) { // Last attempt
          // Generate fallback plan
          return {
            queries: [
              `详细解释 ${topic} 的定义和核心概念`,
              `${topic} 的发展历程和技术演进`,
              `${topic} 的实际应用场景和案例`,
              `${topic} 面临的挑战和解决方案`,
              `${topic} 的未来发展趋势`
            ]
          };
        }
        await this.delay(2000);
      }
    }
    
    // Should not reach here due to fallback, but just in case:
    return {
      queries: [topic]
    };
  }

  private async executeSearches(queries: string[]): Promise<SearchResult[]> {
    logger.info('workflow-orchestrator', `Starting parallel execution of ${queries.length} searches`);
    
    // Process searches in parallel using Promise.all
    const searchTasks = queries.map(async (query, i) => {
      // Clean the query to ensure it's just a search term, not full analysis
      const cleanQuery = this.cleanSearchQuery(query);
      
      logger.info('workflow-orchestrator', `Executing search ${i + 1}/${queries.length}: ${cleanQuery}`);
      
      try {
        // Perform the search - in a real implementation this would call a search API
        // For now, we'll simulate with LLM calls
        const searchResult = await this.searchService.search(cleanQuery);
        
        const searchRecord: SearchResult = {
          id: this.generateId(),
          query: cleanQuery, // Use the cleaned query
          results: searchResult,
          timestamp: Date.now(),
          sourceUrls: this.extractUrls(searchResult) // This would come from actual search results
        };
        
        // Save to local database
        LocalStorageService.saveSearchResult(searchRecord);
        
        // Update progress
        progressTracker.updateProgress(
          'Executing searches', 
          `Completed search ${i + 1}/${queries.length}: ${cleanQuery.substring(0, 30)}...`
        );
        
        return searchRecord;
      } catch (error) {
        logger.error('workflow-orchestrator', `Search failed for query: ${cleanQuery}`, { error });
        // Return error record
        return {
          id: this.generateId(),
          query: cleanQuery,
          results: [`Error during search: ${(error as Error).message}`],
          timestamp: Date.now(),
          sourceUrls: []
        };
      }
    });
    
    const results = await Promise.all(searchTasks);
    
    // Brief delay to be respectful to APIs (do this after all searches complete)
    await this.delay(1000);
    
    logger.info('workflow-orchestrator', `Completed parallel execution of ${queries.length} searches`);
    return results;
  }
  
  // Helper method to clean search queries
  private cleanSearchQuery(query: string): string {
    // Remove any instructional text that might have been included in the query
    let cleanQuery = query.trim();
    
    // Remove common prompt artifacts
    cleanQuery = cleanQuery.replace(/请提供.*?信息[:：]/, '').trim();
    cleanQuery = cleanQuery.replace(/.*?要求[:：]/, '').trim();
    cleanQuery = cleanQuery.replace(/\*\*.*?\*\*/g, '').trim();  // Remove bold markdown
    cleanQuery = cleanQuery.replace(/\[.*?\]/g, '').trim();      // Remove brackets
    cleanQuery = cleanQuery.replace(/主题[:：].*/, '').trim();    // Remove "Topic:" introductions
    cleanQuery = cleanQuery.replace(/内容[:：].*/, '').trim();    // Remove "Content:" introductions
    cleanQuery = cleanQuery.replace(/分析[:：].*/, '').trim();    // Remove "Analysis:" introductions
    cleanQuery = cleanQuery.replace(/.*?定义与基本概念.*/, '').trim(); // Remove section titles
    cleanQuery = cleanQuery.replace(/.*?技术原理与机制.*/, '').trim();   // Remove section titles  
    
    // If the query is still too long (indicating it contains full instructions rather than a topic),
    // try to extract just the core topic
    if (cleanQuery.length > 100) {
      // Look for the first sentence or key phrase that seems like a topic
      const sentences = cleanQuery.split(/[.!?。！？]/);
      if (sentences[0] && sentences[0].length <= 80) {
        cleanQuery = sentences[0];
      } else {
        // If the first sentence is still too long, try to extract a shorter topic
        const words = cleanQuery.split(/\s+/);
        if (words.length > 0) {
          cleanQuery = words.slice(0, 8).join(' '); // Take first 8 words as a reasonable topic
        }
      }
    }
    
    // Extract the main topic if it looks like a full prompt
    if (cleanQuery.includes('主题：')) {
      const topicMatch = cleanQuery.match(/主题：([^\n]+)/);
      if (topicMatch && topicMatch[1]) {
        cleanQuery = topicMatch[1].trim();
      }
    }
    
    return cleanQuery || 'general search'; // Fallback to general search if cleaning fails
  }

  private async summarizeSearchResults(searchResults: SearchResult[]): Promise<string> {
    // Create context from all search results
    let searchContext = "基于以下搜索结果总结：\n\n";
    for (const result of searchResults) {
      searchContext += `搜索查询: ${result.query}\n`;
      searchContext += `结果: ${result.results.slice(0, 5).join(' ')}\n\n`; // Take first 5 results
    }
    
    const summaryPrompt = PROMPTS.SEARCH_SUMMARY_PROMPT.replace('{searchContext}', searchContext);

    // Retry mechanism
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const summary = await this.llmService.callLLM(summaryPrompt, { maxTokens: 5000 });
        logger.info('workflow-orchestrator', `Search summary completed (attempt ${attempt + 1})`);
        return summary;
      } catch (error) {
        logger.warning('workflow-orchestrator', `Search summary attempt ${attempt + 1} failed`, { error });
        if (attempt === 2) {
          throw error;
        }
        await this.delay(2000);
      }
    }
    
    return searchContext; // fallback
  }

  private async generateComprehensiveContent(topic: string, searchSummary: string): Promise<string> {
    // Create multiple LLM calls for comprehensive content with parallel processing
    const sectionTitles = [
      "定义与基本概念",
      "技术原理与机制", 
      "核心组件与架构",
      "应用场景与案例",
      "优势与挑战",
      "发展历程与趋势",
      "实施方法与步骤",
      "最佳实践与建议",
      "相关概念与关联技术",
      "总结与展望"
    ];
    
    logger.info('workflow-orchestrator', `Starting parallel generation of ${sectionTitles.length} sections for: ${topic}`);
    
    // Update progress
    progressTracker.updateProgress(
      'Initializing content generation',
      `Preparing to generate ${sectionTitles.length} sections in parallel`
    );
    
    // Prepare tasks for parallel execution
    const sectionTasks = sectionTitles.map(async (title, index) => {
      logger.info('workflow-orchestrator', `Preparing section ${index + 1}/${sectionTitles.length}: ${title}`);
      
      const sectionPrompt = PROMPTS.SECTION_GENERATION_PROMPT
        .replace('{sectionTitle}', title)
        .replace('{topic}', topic)
        .replace('{searchSummary}', searchSummary)
        .replace('{previousSections}', sectionTitles.slice(0, index).join(', ') || 'None')
        .replace('{nextSections}', sectionTitles.slice(index + 1).join(', ') || 'None');

      // Retry mechanism for each section
      let sectionContent = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          sectionContent = await this.llmService.callLLM(sectionPrompt, { maxTokens: 8000 });
          if (sectionContent && sectionContent.length > 100) {
            logger.info('workflow-orchestrator', `Section "${title}" completed (attempt ${attempt + 1})`);
            
            // Update progress for each completed section
            progressTracker.updateProgress(
              'Generating content sections',
              `Completed section ${index + 1}/${sectionTitles.length}: ${title}`
            );
            
            return { title, content: sectionContent, index };
          }
        } catch (error) {
          logger.warning('workflow-orchestrator', `Section "${title}" attempt ${attempt + 1} failed`, { error });
          if (attempt === 2) {
            // Return empty content for failed attempts
            logger.info('workflow-orchestrator', `Section "${title}" failed after 3 attempts, returning placeholder`);
            return { title, content: '[Content generation failed for this section]', index };
          } else {
            await this.delay(2000);
          }
        }
      }
    });
    
    try {
      // Execute all section generation tasks in parallel
      const sectionResults = await Promise.all(sectionTasks);
      
      // Sort sections by their original index to maintain order
      const sortedResults = sectionResults.sort((a, b) => a.index - b.index);
      
      // Combine sections in the correct order
      const sections: string[] = sortedResults.map(result => 
        `## ${result.title}\n\n${result.content}\n\n`
      );
      
      // Combine all sections
      const fullContent = sections.join('');
      logger.info('workflow-orchestrator', `Generated comprehensive content with ${fullContent.length} characters`);
      return fullContent;
    } catch (error) {
      logger.error('workflow-orchestrator', `Parallel section generation failed`, { error });
      
      // Fallback: generate sections sequentially
      logger.info('workflow-orchestrator', 'Falling back to sequential generation');
      
      const sections: string[] = [];
      for (let i = 0; i < sectionTitles.length; i++) {
        const title = sectionTitles[i];
        logger.info('workflow-orchestrator', `Generating section ${i + 1}/${sectionTitles.length}: ${title}`);
        
        const sectionPrompt = PROMPTS.SECTION_GENERATION_PROMPT
          .replace('{sectionTitle}', title)
          .replace('{topic}', topic)
          .replace('{searchSummary}', searchSummary)
          .replace('{previousSections}', sectionTitles.slice(0, i).join(', ') || 'None')
          .replace('{nextSections}', sectionTitles.slice(i + 1).join(', ') || 'None');

        // Retry mechanism for each section
        let sectionContent = '';
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            sectionContent = await this.llmService.callLLM(sectionPrompt, { maxTokens: 8000 });
            if (sectionContent && sectionContent.length > 100) {
              sections.push(`## ${title}\n\n${sectionContent}\n\n`);
              logger.info('workflow-orchestrator', `Section "${title}" completed (attempt ${attempt + 1})`);
              break;
            }
          } catch (error) {
            logger.warning('workflow-orchestrator', `Section "${title}" attempt ${attempt + 1} failed`, { error });
            if (attempt === 2) {
              // Add empty section for failed attempts
              sections.push(`## ${title}\n\n[Content generation failed for this section]\n\n`);
            } else {
              await this.delay(2000);
            }
          }
        }
        
        // Update progress
        progressTracker.updateProgress(
          'Generating content sections',
          `Completed section ${i + 1}/${sectionTitles.length}: ${title}`
        );
      }
      
      // Combine all sections
      const fullContent = sections.join('');
      logger.info('workflow-orchestrator', `Generated comprehensive content with ${fullContent.length} characters (sequential fallback)`);
      return fullContent;
    }
  }

  private async validateContent(content: string): Promise<string> {
    const validationPrompt = PROMPTS.CONTENT_VALIDATION_PROMPT.replace('{content}', content.substring(0, 20000));

    // Retry mechanism
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const validatedContent = await this.llmService.callLLM(validationPrompt, { maxTokens: 8000 });
        logger.info('workflow-orchestrator', `Content validation completed (attempt ${attempt + 1})`);
        return validatedContent;
      } catch (error) {
        logger.warning('workflow-orchestrator', `Content validation attempt ${attempt + 1} failed`, { error });
        if (attempt === 2) {
          // Return original content if validation fails
          return content;
        }
        await this.delay(2000);
      }
    }
    
    return content;
  }

  private async extractComplexConcepts(topic: string, content: string): Promise<any[]> {
    // Extract complex concepts that might be difficult for beginners
    const conceptExtractionPrompt = PROMPTS.KNOWLEDGE_BASE_EXTRACTION_PROMPT
      .replace('{topic}', topic)
      .replace('{content}', content.substring(0, 20000));  // Limit to stay within token limits

    // Retry mechanism
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await this.llmService.callLLM(conceptExtractionPrompt, { maxTokens: 6000 });
        const parsedResult = JSON.parse(result);
        
        const extractedConcepts = parsedResult.complexConcepts || [];
        logger.info('workflow-orchestrator', `Extracted ${extractedConcepts.length} complex concepts (attempt ${attempt + 1})`);
        return extractedConcepts;
      } catch (error) {
        logger.warning('workflow-orchestrator', `Complex concept extraction attempt ${attempt + 1} failed`, { error });
        if (attempt === 2) {
          // Fallback extraction
          const basicTerms = content.match(/\b([A-Z][a-zA-Z]{2,})\b/g) || [];
          return basicTerms.slice(0, 10).map(term => ({
            term: term,
            locationInContent: "unknown",
            difficultyLevel: "medium",
            briefDescription: `Possible complex term related to ${topic}`
          }));
        }
        await this.delay(2000);
      }
    }
    
    return [];
  }

  private async generateDetailedConceptExplanations(concepts: any[], topic: string, content: string): Promise<any[]> {
    logger.info('workflow-orchestrator', `Starting parallel generation of explanations for ${concepts.length} concepts`);

    if (concepts.length === 0) {
      return [];
    }

    // Create tasks for parallel execution
    const explanationTasks = concepts.map(async (concept, i) => {
      logger.info('workflow-orchestrator', `Preparing explanation task for concept: ${concept.term} (${i + 1}/${concepts.length})`);

      const contentSnippet = content.substring(0, 5000);
      // Ensure we're using just the original topic, not the rewritten prompt text
      const explanationPrompt = PROMPTS.CONCEPT_EXPLANATION_PROMPT
        .replace('{conceptTerm}', concept.term)
        .replace('{topic}', topic)  // Use the original topic, not the potentially rewritten content
        .replace('{locationInContent}', concept.locationInContent || 'unknown')
        .replace('{contentSnippet}', contentSnippet);

      // Retry mechanism for each explanation
      let explanation = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          explanation = await this.llmService.callLLM(explanationPrompt, { maxTokens: 4000 });
          if (explanation && explanation.length > 50) {
            logger.info('workflow-orchestrator', `Generated explanation for concept: ${concept.term} (attempt ${attempt + 1})`);
            
            return {
              id: this.generateId(),
              term: concept.term,
              definition: explanation,
              context: concept.locationInContent,
              relatedTerms: concept.relatedTerms || [],
              sources: [topic],
              timestamp: Date.now(),
              difficultyLevel: concept.difficultyLevel || 'medium'
            };
          }
        } catch (error) {
          logger.warning('workflow-orchestrator', `Explanation generation for ${concept.term} attempt ${attempt + 1} failed`, { error });
          if (attempt === 2) {
            // Return fallback if all attempts fail
            return {
              id: this.generateId(),
              term: concept.term,
              definition: `Detailed explanation for ${concept.term} would be generated here.`,
              context: concept.locationInContent,
              relatedTerms: [],
              sources: [topic],
              timestamp: Date.now(),
              difficultyLevel: concept.difficultyLevel || 'medium'
            };
          } else {
            await this.delay(1000);
          }
        }
      }
    });

    // Execute all explanation generation tasks in parallel
    try {
      // Update progress as we process concepts
      let processedCount = 0;
      const updateProgress = () => {
        const progress = Math.min(95, Math.floor((processedCount / concepts.length) * 100)); // Cap at 95% to allow for final processing
        progressTracker.updateProgress(
          'Generating concept explanations',
          `Processing concept ${processedCount}/${concepts.length}`
        );
      };

      // Track progress by wrapping the promises with progress updates
      const trackedTasks = explanationTasks.map(async (task) => {
        const result = await task;
        processedCount++;
        updateProgress();
        return result;
      });

      const knowledgeBaseResults = await Promise.all(trackedTasks);
      
      // Filter out any undefined results (though there shouldn't be any with our fallbacks)
      const knowledgeBase = knowledgeBaseResults.filter(result => result !== undefined);
      
      logger.info('workflow-orchestrator', `Generated detailed explanations for ${knowledgeBase.length} concepts (parallel execution)`);
      return knowledgeBase;
    } catch (error) {
      logger.error('workflow-orchestrator', `Parallel explanation generation failed, falling back to sequential`, { error });

      // Fallback: generate explanations sequentially
      logger.info('workflow-orchestrator', 'Falling back to sequential generation');
      const knowledgeBase = [];
      
      for (let i = 0; i < concepts.length; i++) {
        const concept = concepts[i];
        logger.info('workflow-orchestrator', `Generating explanation for concept: ${concept.term} (${i + 1}/${concepts.length})`);

        const contentSnippet = content.substring(0, 5000);
        const explanationPrompt = PROMPTS.CONCEPT_EXPLANATION_PROMPT
          .replace('{conceptTerm}', concept.term)
          .replace('{topic}', topic)
          .replace('{locationInContent}', concept.locationInContent || 'unknown')
          .replace('{contentSnippet}', contentSnippet);

        // Retry mechanism for each explanation
        let explanation = '';
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            explanation = await this.llmService.callLLM(explanationPrompt, { maxTokens: 4000 });
            if (explanation && explanation.length > 50) {
              knowledgeBase.push({
                id: this.generateId(),
                term: concept.term,
                definition: explanation,
                context: concept.locationInContent,
                relatedTerms: concept.relatedTerms || [],
                sources: [topic],
                timestamp: Date.now(),
                difficultyLevel: concept.difficultyLevel || 'medium'
              });
              logger.info('workflow-orchestrator', `Generated explanation for concept: ${concept.term} (attempt ${attempt + 1})`);
              break;
            }
          } catch (error) {
            logger.warning('workflow-orchestrator', `Explanation generation for ${concept.term} attempt ${attempt + 1} failed`, { error });
            if (attempt === 2) {
              // Add fallback if all attempts fail
              knowledgeBase.push({
                id: this.generateId(),
                term: concept.term,
                definition: `Detailed explanation for ${concept.term} would be generated here.`,
                context: concept.locationInContent,
                relatedTerms: [],
                sources: [topic],
                timestamp: Date.now(),
                difficultyLevel: concept.difficultyLevel || 'medium'
              });
            } else {
              await this.delay(1000);
            }
          }
        }

        // Update progress during sequential fallback
        progressTracker.updateProgress(
          'Generating concept explanations',
          `Completed explanation ${i + 1}/${concepts.length}: ${concept.term}`
        );
      }

      logger.info('workflow-orchestrator', `Generated detailed explanations for ${knowledgeBase.length} concepts (sequential fallback)`);
      return knowledgeBase;
    }
  }

  private async annotateContentWithConcepts(content: string, knowledgeBase: any[]): Promise<string> {
    // Annotate the content by wrapping difficult terms with clickable spans
    let annotatedContent = content;
    
    for (const entry of knowledgeBase) {
      const term = entry.term;
      // Use word boundary to match the exact term and avoid partial matches
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      annotatedContent = annotatedContent.replace(regex, `<span class="clickable-concept" data-term="${term}">$1</span>`);
    }
    
    // Inject CSS for the clickable concepts
    const cssInjection = `
<style>
.clickable-concept {
  background-color: #fff3cd;
  border-bottom: 2px dashed #ffc107;
  padding: 0 2px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.clickable-concept:hover {
  background-color: #ffeaa7;
  transform: scale(1.02);
}
</style>
`;
    
    return cssInjection + annotatedContent;
  }

  private async generateKnowledgeBase(topic: string, content: string): Promise<any[]> {
    logger.info('workflow-orchestrator', 'Starting complex concept extraction and explanation generation');
    
    // Step 1: Extract complex concepts that may be difficult for beginners
    progressTracker.updateProgress('Extracting concepts', 'Identifying complex terms and concepts');
    const complexConcepts = await this.extractComplexConcepts(topic, content);
    
    // Step 2: Generate detailed explanations for these concepts (most time-consuming part)
    progressTracker.updateProgress('Generating concept explanations', `Creating detailed explanations for ${complexConcepts.length} concepts (this may take a while)`);
    const knowledgeBase = await this.generateDetailedConceptExplanations(complexConcepts, topic, content);
    
    progressTracker.updateProgress('Knowledge base generation complete', `Generated ${knowledgeBase.length} terms with detailed explanations`);
    
    logger.info('workflow-orchestrator', `Generated knowledge base with ${knowledgeBase.length} terms with detailed explanations`);
    return knowledgeBase;
  }

  private createContentNodes(title: string, content: string): any[] {
    // Create a basic tree structure from the content
    return [{
      id: this.generateId(),
      title,
      content: content.substring(0, 500) + '...', // First 500 chars as preview
      children: [],
      details: [],
      expanded: true
    }];
  }

  private extractTitleFromContent(content: string): string {
    // Try to extract the actual title from the generated content
    // It could be in the form of a markdown heading or HTML header
    
    // Look for markdown H1: # Title
    const markdownH1Match = content.match(/^#\s+(.+)$/m);
    if (markdownH1Match) {
      return markdownH1Match[1].trim();
    }
    
    // Look for markdown alternative H1: Title\n=======
    const altH1Match = content.match(/^([^\n]+)\n={3,}/m);
    if (altH1Match) {
      return altH1Match[1].trim();
    }
    
    // Look for the first substantial text as a potential title
    const lines = content.substring(0, 500).split('\n').filter(line => line.trim() !== '');
    for (const line of lines) {
      // Skip bullet points, numbered lists, and other non-title patterns
      if (!line.startsWith('- ') && !line.startsWith('* ') && 
          !line.match(/^\d+\./) && !line.match(/^```/) && 
          !line.match(/^>/)) {
        const trimmedLine = line.trim();
        // Consider lines that look like titles (not too long, not ending with punctuation)
        if (trimmedLine.length > 5 && trimmedLine.length < 100 && 
            !trimmedLine.endsWith('.') && !trimmedLine.endsWith('?') && !trimmedLine.endsWith('!')) {
          return trimmedLine;
        }
      }
    }
    
    return 'Untitled Content'; // fallback
  }

  private extractUrls(searchResult: any[]): string[] {
    // Extract URLs from search results (in a real implementation)
    // This is a simplified version
    return [];
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private sanitizeFileName(fileName: string): string {
    // Remove special characters that might cause issues in filenames
    return fileName
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_]/g, '_') // Replace special characters with underscore
      .substring(0, 100); // Limit length
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


}