// Session History Viewer Component
import React, { useState, useEffect } from 'react';
import { HistoryService, Session } from '../utils/HistoryService';
import { GeneratedContent } from '../types';

interface SessionHistoryViewerProps {
  visible?: boolean;
  onClose?: () => void;
  onItemSelect?: (contentId: string) => void; // Callback when user clicks on a history item
}

export const SessionHistoryViewer: React.FC<SessionHistoryViewerProps> = ({ visible = false, onClose, onItemSelect }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadHistoryBySessions();
    }
  }, [visible]);

  const loadHistoryBySessions = async () => {
    setLoading(true);
    try {
      const sessions = await HistoryService.getHistoryBySessions();
      setSessions(sessions);
    } catch (error) {
      console.error('Error loading history by sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
    }
  };

  const handleTaskClick = (taskId: string) => {
    if (onItemSelect) {
      onItemSelect(taskId);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (!visible) return null;

  return (
    <div className="session-history-viewer">
      <div className="history-header">
        <h3>会话历史记录</h3>
        <div className="history-controls">
          <button onClick={loadHistoryBySessions} className="refresh-btn" disabled={loading}>
            {loading ? '加载中...' : '刷新'}
          </button>
          <button onClick={onClose} className="close-btn">关闭</button>
        </div>
      </div>

      <div className="history-content">
        {loading ? (
          <p className="loading">加载中...</p>
        ) : sessions.length === 0 ? (
          <p className="no-history">暂无会话历史记录</p>
        ) : (
          <div className="session-list">
            {sessions.map((session) => (
              <div key={session.id} className="session-item">
                <div 
                  className="session-header"
                  onClick={() => toggleSession(session.id)}
                >
                  <div className="session-info">
                    <strong>{session.title}</strong>
                    <span className="session-duration">
                      任务数: {session.tasks.length} | 时间: {formatDate(session.startTime)} - {formatDate(session.endTime)}
                    </span>
                  </div>
                  <div className="session-expand-icon">
                    {expandedSession === session.id ? '▼' : '▶'}
                  </div>
                </div>
                
                {expandedSession === session.id && (
                  <div className="session-tasks">
                    {session.tasks.map((task) => (
                      <div key={task.id} className="task-item">
                        <div className="task-header">
                          <div className="task-title" onClick={() => handleTaskClick(task.id)}>
                            {task.title}
                          </div>
                          <div className="task-timestamp">{formatDate(task.timestamp)}</div>
                        </div>
                        <div className="task-actions">
                          <button 
                            onClick={() => handleTaskClick(task.id)}
                            className="view-btn"
                          >
                            查看
                          </button>
                          <button 
                            onClick={() => handleTaskClick(task.id)}
                            className="expand-btn"
                          >
                            📄 放大
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
        .session-history-viewer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 400px;
          background: rgba(15, 23, 42, 0.95); /* Dark background */
          backdrop-filter: blur(10px);
          border-top: 2px solid #475569; /* Darker border */
          color: #e2e8f0; /* Light text */
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: rgba(30, 41, 59, 0.95); /* Dark header */
          border-bottom: 1px solid rgba(148, 163, 184, 0.3); /* Darker border */
        }

        .history-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #e2e8f0; /* Light text */
        }

        .history-controls {
          display: flex;
          gap: 0.5rem;
        }

        .refresh-btn, .close-btn {
          padding: 0.2rem 0.5rem;
          border: 1px solid rgba(148, 163, 184, 0.5); /* Darker border */
          background: rgba(51, 65, 85, 0.7); /* Dark button background */
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          color: #cbd5e1; /* Light text */
        }

        .refresh-btn:hover, .close-btn:hover {
          background: rgba(71, 85, 105, 0.9); /* Slightly lighter on hover */
          border-color: rgba(165, 180, 252, 0.6); /* Lighter border on hover */
          color: #f8fafc; /* Lighter text on hover */
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .history-content {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
          color: #e2e8f0; /* Light text */
        }

        .loading, .no-history {
          text-align: center;
          color: #94a3b8; /* Lighter grey for better contrast */
          margin: 1rem 0;
        }

        .session-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .session-item {
          border: 1px solid rgba(99, 102, 241, 0.3); /* Light blue-purple border */
          border-radius: 8px;
          background: rgba(30, 41, 59, 0.6); /* Darker background */
          overflow: hidden;
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.8rem;
          background: rgba(79, 70, 229, 0.2); /* Slightly purple background */
          cursor: pointer;
        }

        .session-info {
          flex: 1;
        }

        .session-info strong {
          display: block;
          color: #93c5fd; /* Bright blue for session title */
        }

        .session-duration {
          font-size: 0.8rem;
          color: #94a3b8; /* Light grey */
        }

        .session-expand-icon {
          color: #94a3b8; /* Light grey */
          font-size: 0.8rem;
        }

        .session-tasks {
          padding: 0.5rem;
        }

        .task-item {
          padding: 0.6rem;
          border: 1px solid rgba(148, 163, 184, 0.2); /* Darker border */
          border-radius: 6px;
          background: rgba(15, 23, 42, 0.5); /* Dark background */
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .task-header {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .task-title {
          cursor: pointer;
          color: #60a5fa; /* Blue link color */
          text-decoration: underline;
          margin-right: 1rem;
        }

        .task-title:hover {
          color: #93c5fd; /* Lighter blue on hover */
        }

        .task-timestamp {
          font-size: 0.8rem;
          color: #94a3b8; /* Lighter grey */
        }

        .task-actions {
          display: flex;
          gap: 0.5rem;
        }

        .view-btn, .expand-btn {
          padding: 0.2rem 0.5rem;
          border: 1px solid rgba(148, 163, 184, 0.5); /* Darker border */
          background: rgba(51, 65, 85, 0.7); /* Dark button background */
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.7rem;
          color: #cbd5e1; /* Light text */
        }

        .view-btn:hover, .expand-btn:hover {
          background: rgba(71, 85, 105, 0.9); /* Slightly lighter on hover */
          border-color: rgba(165, 180, 252, 0.6); /* Lighter border on hover */
          color: #f8fafc; /* Lighter text on hover */
        }
      `}</style>
    </div>
  );
};