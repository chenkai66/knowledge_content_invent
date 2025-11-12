// Utility functions for the knowledge content generation application
import { v4 as uuidv4 } from 'uuid';
import { ContentNode, DetailNode, KnowledgeBaseEntry, GeneratedContent, ContentGenerationConfig } from './types';

// Generate a unique ID
export const generateId = (): string => {
  return uuidv4();
};

// Format date for display
export const formatDate = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Serialize content to JSON string for storage
export const serializeContent = (content: GeneratedContent): string => {
  return JSON.stringify(content, null, 2);
};

// Deserialize content from JSON string
export const deserializeContent = (contentStr: string): GeneratedContent => {
  return JSON.parse(contentStr);
};

// Generate a knowledge base entry from detail node
export const createKnowledgeBaseEntry = (detail: DetailNode): KnowledgeBaseEntry => {
  return {
    id: generateId(),
    term: detail.term,
    definition: detail.definition,
    context: detail.context,
    relatedTerms: detail.relatedTerms || [],
    sources: [],
    timestamp: Date.now()
  };
};

// Build content tree from flat structure
export const buildContentTree = (nodes: ContentNode[]): ContentNode[] => {
  // Implementation will depend on the specific structure we need
  return nodes;
};

// Flatten content tree to list
export const flattenContentTree = (nodes: ContentNode[]): ContentNode[] => {
  let result: ContentNode[] = [];
  
  for (const node of nodes) {
    result.push({...node, children: []}); // Push the node without children first
    if (node.children && node.children.length > 0) {
      result = result.concat(flattenContentTree(node.children)); // Then add the children
    }
  }
  
  return result;
};

// Sanitize user input to prevent XSS
export const sanitizeInput = (input: string): string => {
  // Basic sanitization - in a real app, use a more robust library
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Validate content generation config
export const validateConfig = (config: ContentGenerationConfig): boolean => {
  if (!config.topic || config.topic.trim() === '') {
    console.error("Topic is required");
    return false;
  }
  
  if (config.wordCount && config.wordCount < 100) {
    console.error("Word count should be at least 100");
    return false;
  }
  
  return true;
};

// Calculate reading time estimate in minutes
export const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200; // Average reading speed
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

// Find details in content that could be expanded
export const findExpandableTerms = (content: string): string[] => {
  // This is a simplified implementation
  // In a real app, this would use NLP to identify key terms
  const regex = /\b(?:[A-Z][a-z]+){2,}\b/g; // Find capitalized terms
  const matches = content.match(regex);
  return matches ? [...new Set(matches)] : []; // Remove duplicates
};