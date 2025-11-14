import React, { useState, useEffect } from 'react';
import { Session } from '../utils/HistoryService';
import { SessionHistoryService } from '../utils/SessionHistoryService';
import { GeneratedContent } from '../types';

interface QueryBasedHistoryViewerProps {
  visible?: boolean;
  onClose?: () => void;
  onItemSelect?: (contentId: string) => void; // Callback when user clicks on a history item
}

export const QueryBasedHistoryViewer: React.FC<QueryBasedHistoryViewerProps> = ({ 
  visible = false, 
  onClose, 
  onItemSelect 
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueryFolder, setSelectedQueryFolder] = useState<string | null>(null);
  const [expandedQueryFolders, setExpandedQueryFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadHistoryBySessions();
    }
  }, [visible]);

  const loadHistoryBySessions = async () => {
    setLoading(true);
    try {
      // Use the session history service to get organized history data
      const sessionsResult = await SessionHistoryService.getHistoryBySessions();
      setSessions(sessionsResult);
      
      // If there's only one query folder, select it by default
      if (sessionsResult.length === 1) {
        setSelectedQueryFolder(sessionsResult[0].id);
        setExpandedQueryFolders(new Set([sessionsResult[0].id]));
      }
    } catch (error) {
      console.error('Error loading history by sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryFolderClick = (folderId: string) => {
    if (selectedQueryFolder === folderId) {
      setSelectedQueryFolder(null);
    } else {
      setSelectedQueryFolder(folderId);
      
      // Toggle expansion
      setExpandedQueryFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) {
          newSet.delete(folderId);
        } else {
          newSet.add(folderId);
        }
        return newSet;
      });
      
      // When a query folder is clicked (but not expanded), load the main content
      // from that folder by finding the most relevant file (with the best title)
      if (!expandedQueryFolders.has(folderId)) {
        const folder = sessions.find(s => s.id === folderId);
        if (folder && folder.tasks.length > 0) {
          // Find the task that seems to be the main content (not starting with prompt_ and has meaningful title)
          const mainTask = folder.tasks.find(task => 
            !task.title.startsWith('prompt_') && 
            task.title.length > 0
          ) || folder.tasks[0]; // Fallback to first task if no obvious main content found
          
          if (mainTask && onItemSelect) {
            onItemSelect(mainTask.id);
          }
        }
      }
    }
  };

  const handleItemClick = (id: string) => {
    if (onItemSelect) {
      onItemSelect(id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (!visible) return null;

  return (
    <div className="query-history-viewer">
      <div className="query-history-header">
        <h3>历史记录 (按查询分组)</h3>
        <div className="query-history-controls">
          <button onClick={loadHistoryBySessions} className="refresh-btn" disabled={loading}>
            {loading ? '加载中...' : '刷新'}
          </button>
          <button onClick={onClose} className="close-btn">关闭</button>
        </div>
      </div>

      <div className="query-history-content">
        {loading ? (
          <p className="loading">加载中...</p>
        ) : sessions.length === 0 ? (
          <p className="no-history">暂无历史记录</p>
        ) : (
          <div className="query-folders-list">
            {sessions.map((session) => (
              <div key={session.id} className="query-folder">
                <div 
                  className={`query-folder-header ${selectedQueryFolder === session.id ? 'selected' : ''}`}
                  onClick={() => handleQueryFolderClick(session.id)}
                >
                  <div className="query-folder-info">
                    <h4>{session.title}</h4>
                    <div className="query-folder-meta">
                      <span>{session.tasks.length} 项</span>
                      <span>{formatDate(session.startTime)}</span>
                    </div>
                  </div>
                  <div className="query-folder-toggle">
                    {expandedQueryFolders.has(session.id) ? '▼' : '►'}
                  </div>
                </div>
                
                {expandedQueryFolders.has(session.id) && (
                  <div className="query-folder-content">
                    {session.tasks.map((task) => (
                      <div key={task.id} className="history-item">
                        <div className="history-item-header" onClick={() => handleItemClick(task.id)}>
                          <div className="history-item-title">
                            <strong>{task.title}</strong>
                          </div>
                          <div className="history-item-timestamp">{formatDate(task.timestamp)}</div>
                        </div>
                        <div className="history-item-actions">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(task.id);
                            }}
                            className="view-btn"
                          >
                            查看
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .query-history-viewer {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          max-width: 900px;
          max-height: 80vh;
          background: rgba(15, 23, 42, 0.95); /* Dark background */
          backdrop-filter: blur(10px);
          border: 2px solid #475569; /* Darker border */
          border-radius: 8px;
          color: #e2e8f0; /* Light text */
          z-index: 1001;
          display: flex;
          flex-direction: column;
        }

        .query-history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.8rem;
          background: rgba(30, 41, 59, 0.95); /* Dark header */
          border-bottom: 1px solid rgba(148, 163, 184, 0.3); /* Darker border */
          border-radius: 6px 6px 0 0;
        }

        .query-history-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #e2e8f0; /* Light text */
        }

        .query-history-controls {
          display: flex;
          gap: 0.5rem;
        }

        .refresh-btn, .close-btn, .view-btn {
          padding: 0.4rem 0.8rem;
          border: 1px solid rgba(148, 163, 184, 0.5); /* Darker border */
          background: rgba(51, 65, 85, 0.7); /* Dark button background */
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          color: #cbd5e1; /* Light text */
        }

        .refresh-btn:hover, .close-btn:hover, .view-btn:hover {
          background: rgba(71, 85, 105, 0.9); /* Slightly lighter on hover */
          border-color: rgba(165, 180, 252, 0.6); /* Lighter border on hover */
          color: #f8fafc; /* Lighter text on hover */
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .query-history-content {
          flex: 1;
          overflow-y: auto;
          padding: 0.8rem;
          color: #e2e8f0; /* Light text */
        }

        .loading, .no-history {
          text-align: center;
          color: #94a3b8; /* Lighter grey for better contrast */
          margin: 1rem 0;
        }

        .query-folders-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .query-folder {
          border: 1px solid rgba(148, 163, 184, 0.3); /* Darker border */
          border-radius: 4px;
          background: rgba(30, 41, 59, 0.6); /* Darker background */
          overflow: hidden;
        }

        .query-folder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.8rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .query-folder-header:hover {
          background: rgba(51, 65, 85, 0.5); /* Slightly lighter on hover */
        }

        .query-folder-header.selected {
          background: rgba(71, 85, 105, 0.7); /* Selected background */
        }

        .query-folder-info {
          flex: 1;
        }

        .query-folder-info h4 {
          margin: 0 0 0.2rem 0;
          color: #60a5fa; /* Blue header color */
        }

        .query-folder-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: #94a3b8; /* Lighter grey */
        }

        .query-folder-toggle {
          font-size: 1.2rem;
          color: #94a3b8; /* Lighter grey */
        }

        .query-folder-content {
          padding: 0 0.8rem 0.8rem 0.8rem;
          border-top: 1px solid rgba(148, 163, 184, 0.2); /* Darker border */
        }

        .history-item {
          padding: 0.6rem;
          border: 1px solid rgba(148, 163, 184, 0.2); /* Darker border */
          border-radius: 4px;
          margin-bottom: 0.5rem;
          background: rgba(15, 23, 42, 0.4); /* Darker background */
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .history-item-header {
          flex: 1;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .history-item-title {
          color: #93c5fd; /* Lighter blue */
        }

        .history-item-title:hover {
          color: #bfdbfe; /* Even lighter blue on hover */
        }

        .history-item-timestamp {
          font-size: 0.8rem;
          color: #94a3b8; /* Lighter grey */
          margin-left: 1rem;
        }

        .history-item-actions {
          display: flex;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
};