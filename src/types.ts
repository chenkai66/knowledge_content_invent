// Type definitions for the knowledge content generation application

export interface ContentNode {
  id: string;
  title: string;
  content: string;
  children: ContentNode[];
  details?: DetailNode[];
  expanded: boolean;
}

export interface DetailNode {
  id: string;
  term: string;
  definition: string;
  context: string;
  relatedTerms?: string[];
  timestamp: number;
}

export interface KnowledgeBaseEntry {
  id: string;
  term: string;
  definition: string;
  context: string;
  relatedTerms: string[];
  sources: string[];
  timestamp: number;
}

export interface GenerationProgress {
  step: string;
  current: number;
  total: number;
  status: string;
  details?: string;
}

export interface AgentTask {
  id: string;
  type: 'research' | 'generate' | 'expand' | 'validate';
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
  result?: any;
}

export interface GeneratedContent {
  id: string;
  title: string;
  mainContent: string;
  nodes: ContentNode[];
  knowledgeBase: KnowledgeBaseEntry[];
  timestamp: number;
  generationSteps: string[];
  progress: GenerationProgress[];
}

export interface ContentGenerationConfig {
  topic: string;
  depth: 'shallow' | 'medium' | 'deep';
  style: 'formal' | 'casual' | 'technical';
  targetAudience: 'beginner' | 'intermediate' | 'expert';
  wordCount?: number;
  includeExamples?: boolean;
  includeDiagrams?: boolean;
  maxRecurseDepth?: number;
  enableKeywordExtraction?: boolean;
}

export interface SearchResult {
  id: string;
  query: string;
  results: any[];
  timestamp: number;
  sourceUrls: string[];
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  baseUrl?: string;
}