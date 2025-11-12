// Session-based History Service
import { GeneratedContent, PromptRecord } from '../types';
import { deserializeContent } from '../utils';
import { Session } from './HistoryService';

export interface SessionHistoryService {
  // Get history organized by sessions (grouped by time periods)
  static async getHistoryBySessions(): Promise<Session[]> {
    try {
      const response = await fetch('/api/history/index');
      if (!response.ok) {
        throw new Error(`Failed to load history index: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.sessions) {
        // Return the organized session data
        return result.sessions;
      } else {
        // Fallback to flat history if sessions aren't available
        const flatHistory = result.success ? result.history : [];
        const sessions: Session[] = [];
        
        if (flatHistory.length > 0) {
          // Create a single session containing all items if no sessions are organized
          sessions.push({
            id: 'all-items-session',
            title: '全部历史记录',
            startTime: Math.min(...flatHistory.map(h => h.timestamp)),
            endTime: Math.max(...flatHistory.map(h => h.timestamp)),
            tasks: flatHistory
          });
        }
        
        return sessions;
      }
    } catch (error) {
      console.error('Error loading history by sessions:', error);
      return [];
    }
  }

  // Get task details within a specific session
  static async getTaskDetails(taskId: string): Promise<GeneratedContent | PromptRecord | null> {
    try {
      const response = await fetch(`/api/history/load/${taskId}`);
      if (!response.ok) {
        throw new Error(`Failed to load task details: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Determine if it's content or prompt record and return appropriately
        if (result.content.mainContent !== undefined) {
          // This is a GeneratedContent object
          return deserializeContent(JSON.stringify(result.content));
        } else {
          // This is likely a PromptRecord object
          return result.content as PromptRecord;
        }
      } else {
        throw new Error(result.error || 'Failed to load task details');
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      return null;
    }
  }
}