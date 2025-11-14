// History Service for the knowledge content generation application
import { GeneratedContent } from '../types';
import { deserializeContent } from '../utils';
import { PromptRecord, PromptTracker } from './PromptTracker';

export interface Session {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  tasks: Array<{id: string, title: string, timestamp: number}>;
}

export class HistoryService {
  // Save generated content to history file (using backend API)
  static async saveToHistory(content: GeneratedContent, originalQuery?: string): Promise<void> {
    try {
      const response = await fetch('/api/history/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          title: this.sanitizeFileName(content.title),
          query: originalQuery || content.title, // Use original query if available, otherwise use title
          type: 'generated-content'  // Distinguish from other types of history
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save content to history: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Content saved to history: ${result.fileName}`);
    } catch (error) {
      console.error('Error saving content to history:', error);
      throw error;
    }
  }

  // Get history index from backend
  static async getHistoryIndex(): Promise<Array<{id: string, title: string, timestamp: number, filePath: string}>> {
    try {
      const response = await fetch('/api/history/index');
      if (!response.ok) {
        throw new Error(`Failed to load history index: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        return result.history;
      } else {
        throw new Error(result.error || 'Failed to load history index');
      }
    } catch (error) {
      console.error('Error loading history index:', error);
      return [];
    }
  }

  // Get simplified history with just user queries and final documents
  static async getSimpleHistory(): Promise<Array<{id: string, query: string, timestamp: number, filePath: string}>> {
    try {
      const response = await fetch('/api/history/index');
      if (!response.ok) {
        throw new Error(`Failed to load history index: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Return only the final generated content (not intermediate steps)
        const historyItems = result.history || [];
        
        return historyItems.map(item => ({
          id: item.id,
          query: item.title, // Use the title as the query
          timestamp: item.timestamp,
          filePath: item.filePath
        })).sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
      } else {
        throw new Error(result.error || 'Failed to load history index');
      }
    } catch (error) {
      console.error('Error loading simple history:', error);
      return [];
    }
  }

  // Save prompt record to history (using backend API)
  static async savePromptToHistory(promptRecord: PromptRecord): Promise<void> {
    try {
      const response = await fetch('/api/history/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: promptRecord,
          title: `prompt_${promptRecord.timestamp}_${this.sanitizeFileName(promptRecord.prompt.substring(0, 30))}`,
          type: 'prompt-record'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save prompt to history: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Prompt saved to history: ${result.fileName}`);
    } catch (error) {
      console.error('Error saving prompt to history:', error);
      throw error;
    }
  }

  // Get all history files
  static async getAllHistoryFiles(): Promise<Array<{id: string, title: string, timestamp: number, filePath: string}>> {
    return await this.getHistoryIndex();
  }

  // Load content from history by ID (filename) using backend API
  static async loadFromHistory(id: string): Promise<GeneratedContent | null> {
    try {
      const response = await fetch(`/api/history/load/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to load content from history: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Parse and deserialize the content
        return deserializeContent(JSON.stringify(result.content));
      } else {
        throw new Error(result.error || 'Failed to load content from history');
      }
    } catch (error) {
      console.error('Error loading content from history:', error);
      return null;
    }
  }

  // Download a history file
  static async downloadHistoryFile(id: string): Promise<void> {
    try {
      // For download, we'll use the dedicated download endpoint
      window.open(`/api/history/download/${id}`, '_blank');
    } catch (error) {
      console.error('Error downloading history file:', error);
      throw error;
    }
  }

  // Get only prompt records from history (currently from prompt tracker)
  static async getPromptRecords(): Promise<PromptRecord[]> {
    // Returns prompt records from the prompt tracker (would be expanded to include file-based prompts)
    return PromptTracker.getPromptHistory();
  }

  // Helper function to sanitize filename
  private static sanitizeFileName(fileName: string): string {
    // Remove special characters that might cause issues in filenames
    return fileName
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_]/g, '_') // Replace special characters with underscore
      .substring(0, 100); // Limit length
  }

  // Delete a history entry
  static async deleteHistoryEntry(id: string): Promise<void> {
    // Placeholder - would need backend API endpoint to implement this
    console.warn('Delete history entry not yet implemented in backend');
  }

  // Clear all history entries from backend
  static async clearAllHistory(): Promise<void> {
    try {
      const response = await fetch('/api/history/clear', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to clear history: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('All history cleared successfully:', result.message);
    } catch (error) {
      console.error('Error clearing all history:', error);
      // Fallback - try to clear locally stored history entries
      try {
        // Remove all history-related items from localStorage
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.startsWith('history_') || key.includes('history') || key === 'generated_content'
        );
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log(`Cleared ${keysToRemove.length} local history items`);
      } catch (localError) {
        console.error('Error clearing local history:', localError);
      }
      throw error;
    }
  }
}

// Export the Session interface for external use
export { Session };