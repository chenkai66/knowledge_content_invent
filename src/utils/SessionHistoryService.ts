// Session-based History Service
import { GeneratedContent, PromptRecord } from '../types';
import { deserializeContent } from '../utils';
import { Session } from './HistoryService';

export class SessionHistoryService {
  // Get history organized by sessions (grouped by query folders)
  static async getHistoryBySessions(): Promise<Session[]> {
    try {
      const response = await fetch('/api/history/index');
      if (!response.ok) {
        throw new Error(`Failed to load history index: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.history) {
        // Group history items by query folder
        const historyItems = result.history;
        const groupedByQuery: Record<string, typeof historyItems> = {};
        const queryTitles: Record<string, string> = {};
        
        historyItems.forEach((item: any) => {
          const folder = item.queryFolder || 'unorganized';
          if (!groupedByQuery[folder]) {
            groupedByQuery[folder] = [];
          }
          groupedByQuery[folder].push(item);
          
          // Store a representative title for the query folder
          if (!queryTitles[folder]) {
            queryTitles[folder] = item.query || item.title || folder;
          }
        });

        // Convert to Session format - extract the original query from the folder name by removing timestamp part
        const organizedSessions: Session[] = Object.entries(groupedByQuery).map(([folder, items]) => {
          // Extract the original query by removing the timestamp part (last 14 characters: YYYYMMDDHHMMSS)
          // e.g., "信号传输-20251114135722" -> "信号传输"
          let displayTitle = folder;
          if (folder.length > 14 && /^\d{14}$/.test(folder.slice(-14))) {
            displayTitle = folder.slice(0, -15); // Remove dash and timestamp
          }
          
          return {
            id: folder, // Keep the full folder name as ID so files can be found
            title: queryTitles[folder] || displayTitle, // Use original query as title
            startTime: Math.min(...items.map((item: any) => item.timestamp)),
            endTime: Math.max(...items.map((item: any) => item.timestamp)),
            tasks: items.map((item: any) => ({
              id: item.id,
              title: item.title,
              timestamp: item.timestamp
            }))
          };
        });

        // Sort sessions by most recent
        organizedSessions.sort((a, b) => b.startTime - a.startTime);
        
        return organizedSessions;
      } else {
        // Fallback to flat history if sessions aren't available
        const flatHistory = result.success ? result.history : [];
        const sessions: Session[] = [];

        if (flatHistory.length > 0) {
          // Create a single session containing all items if no sessions are organized
          sessions.push({
            id: 'all-items-session',
            title: '全部历史记录',
            startTime: Math.min(...flatHistory.map((h: any) => h.timestamp)),
            endTime: Math.max(...flatHistory.map((h: any) => h.timestamp)),
            tasks: flatHistory.map((h: any) => ({
              id: h.id,
              title: h.title,
              timestamp: h.timestamp
            }))
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
        if (result.content?.mainContent !== undefined) {
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