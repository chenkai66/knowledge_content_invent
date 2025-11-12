// Local Storage Service for the knowledge content generation application
import { GeneratedContent, KnowledgeBaseEntry } from '../types';
import { serializeContent, deserializeContent } from '../utils';
import { SearchResult } from '../agents/EnhancedWorkflowOrchestrator';

const CONTENT_STORAGE_KEY = 'knowledge_content_generated';
const KNOWLEDGE_BASE_KEY = 'knowledge_base_entries';
const HISTORY_KEY = 'generation_history';
const SEARCH_HISTORY_KEY = 'search_history';

export class LocalStorageService {
  // Save generated content to local storage
  static saveGeneratedContent(content: GeneratedContent): void {
    try {
      const existingContent = this.getGeneratedContent();
      const updatedContent = [...existingContent, content];
      localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(updatedContent));
    } catch (error) {
      console.error('Error saving generated content to local storage:', error);
    }
  }

  // Get all generated content from local storage
  static getGeneratedContent(): GeneratedContent[] {
    try {
      const contentStr = localStorage.getItem(CONTENT_STORAGE_KEY);
      if (!contentStr) {
        return [];
      }
      return JSON.parse(contentStr).map((content: any) => deserializeContent(JSON.stringify(content)));
    } catch (error) {
      console.error('Error loading generated content from local storage:', error);
      return [];
    }
  }

  // Get a specific content by ID
  static getGeneratedContentById(id: string): GeneratedContent | undefined {
    const allContent = this.getGeneratedContent();
    return allContent.find(content => content.id === id);
  }

  // Save knowledge base entry to local storage
  static saveKnowledgeBaseEntry(entry: KnowledgeBaseEntry): void {
    try {
      const existingEntries = this.getKnowledgeBaseEntries();
      const updatedEntries = [...existingEntries, entry];
      localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(updatedEntries));
    } catch (error) {
      console.error('Error saving knowledge base entry to local storage:', error);
    }
  }

  // Get all knowledge base entries from local storage
  static getKnowledgeBaseEntries(): KnowledgeBaseEntry[] {
    try {
      const entriesStr = localStorage.getItem(KNOWLEDGE_BASE_KEY);
      if (!entriesStr) {
        return [];
      }
      return JSON.parse(entriesStr);
    } catch (error) {
      console.error('Error loading knowledge base entries from local storage:', error);
      return [];
    }
  }

  // Get knowledge base entry by term
  static getKnowledgeBaseEntryByTerm(term: string): KnowledgeBaseEntry | undefined {
    const allEntries = this.getKnowledgeBaseEntries();
    return allEntries.find(entry => entry.term === term);
  }

  // Save generation history
  static saveGenerationHistory(prompt: string, resultId: string): void {
    try {
      const history = this.getGenerationHistory();
      const newEntry = {
        id: resultId,
        prompt,
        timestamp: Date.now()
      };
      const updatedHistory = [...history, newEntry];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving generation history to local storage:', error);
    }
  }

  // Get generation history
  static getGenerationHistory(): Array<{id: string, prompt: string, timestamp: number}> {
    try {
      const historyStr = localStorage.getItem(HISTORY_KEY);
      if (!historyStr) {
        return [];
      }
      return JSON.parse(historyStr);
    } catch (error) {
      console.error('Error loading generation history from local storage:', error);
      return [];
    }
  }

  // Clear all stored data
  static clearAll(): void {
    try {
      localStorage.removeItem(CONTENT_STORAGE_KEY);
      localStorage.removeItem(KNOWLEDGE_BASE_KEY);
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing local storage:', error);
    }
  }

  // Save search result to local storage
  static saveSearchResult(result: SearchResult): void {
    try {
      const existingResults = this.getSearchHistory();
      const updatedResults = [...existingResults, result];
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedResults));
    } catch (error) {
      console.error('Error saving search result to local storage:', error);
    }
  }

  // Get search history from local storage
  static getSearchHistory(): SearchResult[] {
    try {
      const resultsStr = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!resultsStr) {
        return [];
      }
      return JSON.parse(resultsStr);
    } catch (error) {
      console.error('Error loading search history from local storage:', error);
      return [];
    }
  }

  // Get a specific search result by ID
  static getSearchResultById(id: string): SearchResult | undefined {
    const allResults = this.getSearchHistory();
    return allResults.find(result => result.id === id);
  }

  // Initialize local storage with default data if empty
  static initialize(): void {
    if (!localStorage.getItem(CONTENT_STORAGE_KEY)) {
      localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(KNOWLEDGE_BASE_KEY)) {
      localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(HISTORY_KEY)) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(SEARCH_HISTORY_KEY)) {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify([]));
    }
  }
}

// Initialize the storage when the service is loaded
LocalStorageService.initialize();