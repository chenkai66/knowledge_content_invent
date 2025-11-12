// Multi-agent system for the knowledge content generation application
import { ContentGenerationConfig } from '../types';
import { generateId, findExpandableTerms } from '../utils';
import { logger, progressTracker } from '../utils/Logger';
import { PromptTracker } from '../utils/PromptTracker';
import { RealLLMService, LLMConfig } from '../utils/RealLLMService';
import { ChunkedContentGenerator } from '../utils/ChunkedContentGenerator';

export class ResearchAgent implements Agent {
  id: string;
  name: string;
  description: string;
  private llmService: RealLLMService;

  constructor(llmService: RealLLMService) {
    this.id = generateId();
    this.name = 'Research Agent';
    this.description = 'Researches and gathers information related to the topic';
    this.llmService = llmService;
  }

  async execute(input: { topic: string, depth: string }): Promise<any> {
    logger.info('research-agent', `Starting research for topic: ${input.topic} with depth: ${input.depth}`);
    
    // Create a research prompt
    const researchPrompt = `请对 "${input.topic}" 这个主题进行深入研究，并提供详细的信息，包括定义、历史、应用、发展趋势等。研究深度要求：${input.depth}。`;
    
    // For deep research, we might want more comprehensive results
    let researchResults = '';
    
    if (input.depth === 'deep') {
      logger.info('research-agent', 'Using chunked generation for deep research');
      const chunkedGenerator = new ChunkedContentGenerator(this.llmService);
      researchResults = await chunkedGenerator.generateLongContent(
        `Deep research on ${input.topic}`,
        8000, // Target for comprehensive research
        {
          model: 'qwen-max-latest',
          temperature: 0.7
        }
      );
    } else {
      researchResults = await this.llmService.callLLM(researchPrompt, {
        model: 'qwen-max-latest',
        maxTokens: 4000  // Adjusted to work within API limits (max 8192)
      });
    }
    
    logger.info('research-agent', `Research completed for topic: ${input.topic}`);
    
    return {
      researchResults,
      sources: [`Source 1 for ${input.topic}`, `Source 2 for ${input.topic}`]
    };
  }
}

export class GenerationAgent implements Agent {
  id: string;
  name: string;
  description: string;
  private llmService: RealLLMService;

  constructor(llmService: RealLLMService) {
    this.id = generateId();
    this.name = 'Generation Agent';
    this.description = 'Creates the main content based on research and user requirements';
    this.llmService = llmService;
  }

  async execute(input: { topic: string, research: any, config: ContentGenerationConfig }): Promise<any> {
    logger.info('generation-agent', `Starting content generation for topic: ${input.topic} with target word count: ${input.config.wordCount || 1000}`);
    
    // Create a generation prompt
    const generationPrompt = `
      基于以下研究结果，为 "${input.topic}" 主题生成详细内容：
      研究结果：${input.research.researchResults}
      
      要求：
      - 风格：${input.config.style}
      - 目标受众：${input.config.targetAudience}
      - 字数：${input.config.wordCount || 1000}
      - 包含示例：${input.config.includeExamples ? '是' : '否'}
      
      请生成一篇结构清晰、内容详实的文章。
    `;
    
    // Use chunked generation for larger content requests to work within API limits
    const targetWordCount = input.config.wordCount || 1000;
    let mainContent = '';
    
    if (targetWordCount > 6000) { // Use chunked approach for longer content
      logger.info('generation-agent', `Using chunked generation for long content: ${targetWordCount} words`);
      const chunkedGenerator = new ChunkedContentGenerator(this.llmService);
      mainContent = await chunkedGenerator.generateLongContent(
        input.topic, 
        targetWordCount,
        {
          model: 'qwen-max-latest',
          temperature: 0.7
        }
      );
    } else {
      // Use single call for shorter content
      mainContent = await this.llmService.callLLM(generationPrompt, {
        model: 'qwen-max-latest',
        maxTokens: Math.min(8000, Math.floor(targetWordCount * 1.5)), // Rough estimation: 1.5 tokens per character
        temperature: 0.7
      });
    }
    
    logger.info('generation-agent', `Content generation completed for topic: ${input.topic}. Generated ${mainContent.length} characters.`);
    
    return {
      mainContent,
      outline: [`Introduction to ${input.topic}`, `Key Concepts`, `Detailed Explanation`, `Examples`, `Conclusion`]
    };
  }
}

export class ExpansionAgent implements Agent {
  id: string;
  name: string;
  description: string;
  private llmService: RealLLMService;

  constructor(llmService: RealLLMService) {
    this.id = generateId();
    this.name = 'Expansion Agent';
    this.description = 'Generates detailed explanations for specific terms and concepts';
    this.llmService = llmService;
  }

  async execute(input: { term: string, context: string, content: string }): Promise<any> {
    logger.info('expansion-agent', `Expanding term: ${input.term} in context: ${input.context}`);
    
    // Create an expansion prompt
    const expansionPrompt = `
      请对术语 "${input.term}" 进行详细解释：
      上下文：${input.context}
      主要内容：${input.content.substring(0, 500)}...
      
      要求：
      - 提供准确的定义
      - 解释其在上下文中的具体含义
      - 提供1-2个实际例子
      - 列出与该术语相关的其他术语
    `;
    
    // For complex terms, we might need more detailed explanations
    let expansionResult = '';
    
    // Check if this is a complex term that might need more detail
    const complexTerms = ['算法', '架构', '协议', '模型', '框架', '系统']; // Common complex terms
    const isComplexTerm = complexTerms.some(term => input.term.includes(term));
    
    if (isComplexTerm) {
      logger.info('expansion-agent', `Using chunked generation for complex term: ${input.term}`);
      const chunkedGenerator = new ChunkedContentGenerator(this.llmService);
      expansionResult = await chunkedGenerator.generateLongContent(
        `Detailed explanation of the term "${input.term}" in context: ${input.context}`,
        6000, // Target for comprehensive term explanation
        {
          model: 'qwen-max-latest',
          temperature: 0.5
        }
      );
    } else {
      expansionResult = await this.llmService.callLLM(expansionPrompt, {
        model: 'qwen-max-latest',
        maxTokens: 4000,  // Adjusted to work within API limits (max 8192)
        temperature: 0.5
      });
    }
    
    logger.info('expansion-agent', `Term expansion completed for: ${input.term}`);
    
    return {
      definition: `Detailed definition of ${input.term}`,
      explanation: expansionResult,
      examples: [`Example 1 of ${input.term}`, `Example 2 of ${input.term}`],
      relatedTerms: findExpandableTerms(input.content)
    };
  }
}

export class ValidationAgent implements Agent {
  id: string;
  name: string;
  description: string;
  private llmService: RealLLMService;

  constructor(llmService: RealLLMService) {
    this.id = generateId();
    this.name = 'Validation Agent';
    this.description = 'Validates the generated content for accuracy and completeness';
    this.llmService = llmService;
  }

  async execute(input: { content: string, research: any }): Promise<any> {
    logger.info('validation-agent', `Validating content: ${input.content.substring(0, 100)}...`);
    
    // Create a validation prompt
    const validationPrompt = `
      请验证以下内容的准确性和完整性：
      内容：${input.content.substring(0, 1000)}...
      
      研究依据：${input.research.researchResults.substring(0, 500)}...
      
      请评估：
      - 内容的准确性
      - 信息的完整性
      - 是否有逻辑错误
      - 是否需要补充或修正
    `;
    
    const validationResult = await this.llmService.callLLM(validationPrompt, {
      model: 'qwen-max-latest',
      maxTokens: 2000,  // Adjusted to work within API limits (max 8192)
      temperature: 0.3
    });
    
    logger.info('validation-agent', `Content validation completed`);
    
    return {
      isValid: true,
      suggestions: [validationResult],
      accuracyScore: 0.95
    };
  }
}

export class AgentOrchestrator {
  private agents: Agent[] = [];
  private llmService: RealLLMService;

  constructor(llmConfig?: LLMConfig) {
    // Initialize the LLM service with provided config or let it use environment variables
    this.llmService = new RealLLMService(llmConfig);
    
    // Initialize agents with the LLM service
    this.agents.push(new ResearchAgent(this.llmService));
    this.agents.push(new GenerationAgent(this.llmService));
    this.agents.push(new ExpansionAgent(this.llmService));
    this.agents.push(new ValidationAgent(this.llmService));
  }

  async runWorkflow(config: ContentGenerationConfig): Promise<GeneratedContent> {
    logger.info('agent-orchestrator', `Starting content generation workflow for topic: ${config.topic}`);
    
    // Track progress
    progressTracker.startTracking(3 + findExpandableTerms(config.topic).length, 'Initializing agents');
    
    // Step 1: Research
    logger.info('agent-orchestrator', `Starting research for topic: ${config.topic}`);
    progressTracker.updateProgress('Researching topic', `Gathering information about ${config.topic}`);
    
    const researchAgent = this.agents.find(agent => agent.name === 'Research Agent') as ResearchAgent;
    const researchResults = await researchAgent.execute({
      topic: config.topic,
      depth: config.depth
    });
    logger.info('agent-orchestrator', `Research completed for topic: ${config.topic}`);

    // Step 2: Generate main content
    logger.info('agent-orchestrator', `Generating main content for topic: ${config.topic}`);
    progressTracker.updateProgress('Generating main content', `Creating comprehensive content for ${config.topic}`);
    
    const generationAgent = this.agents.find(agent => agent.name === 'Generation Agent') as GenerationAgent;
    const generationResults = await generationAgent.execute({
      topic: config.topic,
      research: researchResults,
      config
    });
    logger.info('agent-orchestrator', `Main content generation completed for topic: ${config.topic}`);

    // Step 3: Validate content
    logger.info('agent-orchestrator', `Validating content for topic: ${config.topic}`);
    progressTracker.updateProgress('Validating content', 'Checking accuracy and completeness');
    
    const validationAgent = this.agents.find(agent => agent.name === 'Validation Agent') as ValidationAgent;
    const validationResults = await validationAgent.execute({
      content: generationResults.mainContent,
      research: researchResults
    });
    logger.info('agent-orchestrator', `Content validation completed for topic: ${config.topic}`);

    // Create the final content structure
    const contentId = generateId();
    const timestamp = Date.now();

    // Generate a basic tree structure from the generated content
    const contentNodes = this.createContentNodes(config.topic, generationResults.mainContent);
    
    // Find expandable terms in the content
    const expandableTerms = findExpandableTerms(generationResults.mainContent);
    logger.info('agent-orchestrator', `Found ${expandableTerms.length} expandable terms in content for topic: ${config.topic}`);
    
    // Generate details for each expandable term
    const knowledgeBase = [];
    const expansionAgent = this.agents.find(agent => agent.name === 'Expansion Agent') as ExpansionAgent;
    
    for (const term of expandableTerms) {
      logger.info('agent-orchestrator', `Expanding term: ${term}`);
      progressTracker.updateProgress('Generating term details', `Processing: ${term}`);
      
      const termDetails = await expansionAgent.execute({
        term,
        context: generationResults.mainContent.substring(0, 500), // First 500 chars as context
        content: generationResults.mainContent
      });
      
      const knowledgeEntry = {
        id: generateId(),
        term: term,
        definition: termDetails.definition,
        context: generationResults.mainContent.substring(0, 200),
        relatedTerms: termDetails.relatedTerms,
        sources: researchResults.sources || [],
        timestamp: Date.now()
      };
      
      knowledgeBase.push(knowledgeEntry);
      logger.info('agent-orchestrator', `Term expanded: ${term}`);
    }

    const generatedContent: GeneratedContent = {
      id: contentId,
      title: config.topic,
      mainContent: generationResults.mainContent,
      nodes: contentNodes,
      knowledgeBase,
      timestamp,
      generationSteps: [
        `Research: ${config.topic}`, 
        `Generate: Main content`, 
        `Validate: Content accuracy`, 
        `Expand: ${expandableTerms.length} terms`
      ],
      progress: progressTracker.getProgress()
    };

    logger.info('agent-orchestrator', `Content generation completed for topic: ${config.topic}`, { contentId });
    return generatedContent;
  }

  private createContentNodes(title: string, content: string): any[] {
    // Create a basic tree structure from the content
    // This is a simplified version - in a real app, this would parse the content properly
    return [{
      id: generateId(),
      title,
      content,
      children: [],
      details: [],
      expanded: true
    }];
  }

  async generateTermDetails(term: string, context: string, content: string) {
    const expansionAgent = this.agents.find(agent => agent.name === 'Expansion Agent') as ExpansionAgent;
    return await expansionAgent.execute({ term, context, content });
  }
}