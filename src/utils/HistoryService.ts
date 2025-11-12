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
  static async saveToHistory(content: GeneratedContent): Promise<void> {
    try {
      const response = await fetch('/api/history/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          title: this.sanitizeFileName(content.title),
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

  // Get history organized by sessions
  static async getHistoryBySessions(): Promise<Session[]> {
    try {
      const response = await fetch('/api/history/index');
      if (!response.ok) {
        throw new Error(`Failed to load history index: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Use the session data if available, otherwise create sessions from history
        if (result.sessions && result.sessions.length > 0) {
          return result.sessions;
        }
        
        // Group history items by session (within 30-minute windows of each other)
        const historyItems = result.history || [];
        const sessions: Session[] = [];

        if (historyItems.length === 0) {
          return sessions;
        }

        // Sort by timestamp (newest first)
        const sortedItems = historyItems.sort((a, b) => b.timestamp - a.timestamp);

        let currentSession: Session | null = null;
        const SESSION_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

        for (const item of sortedItems) {
          // If no current session or this item is outside the threshold, start a new session
          if (!currentSession || (currentSession.startTime - item.timestamp) > SESSION_THRESHOLD_MS) {
            // Finalize the previous session if it exists
            if (currentSession) {
              // Make sure to set the endTime as the timestamp of the latest item in the session
              currentSession.endTime = currentSession.tasks[currentSession.tasks.length - 1]?.timestamp || currentSession.startTime;
              sessions.push(currentSession);
            }

            // Start a new session
            currentSession = {
              id: `session-${Date.now()}-${item.timestamp}`,
              title: `会话 ${new Date(item.timestamp).toLocaleDateString('zh-CN')} ${new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
              startTime: item.timestamp,
              endTime: item.timestamp,
              tasks: [{
                id: item.id,
                title: item.title,
                timestamp: item.timestamp
              }]
            };
          } else {
            // Add to the current session
            if (currentSession) {
              currentSession.tasks.push({
                id: item.id,
                title: item.title,
                timestamp: item.timestamp
              });

              // Update the session's start/end times
              if (item.timestamp < currentSession.startTime) {
                currentSession.startTime = item.timestamp;
              }
              if (item.timestamp > currentSession.endTime) {
                currentSession.endTime = item.timestamp;
              }
            }
          }
        }

        // Add the last session if it exists
        if (currentSession) {
          sessions.push(currentSession);
        }

        return sessions;
      } else {
        throw new Error(result.error || 'Failed to load history index');
      }
    } catch (error) {
      console.error('Error loading history by sessions:', error);
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
    // Returns prompt records from the prompt tracker (would be extended to include file-based prompts)
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
}

// Export the Session interface for external use
export { Session };