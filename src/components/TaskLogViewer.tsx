// Task Log Viewer Component (Unified history and logs)
import React, { useState, useEffect } from 'react';
import { HistoryService } from '../utils/HistoryService';
import { PromptTracker } from '../utils/PromptTracker';
import { PromptRecord } from '../utils/PromptTracker';

interface TaskLogViewerProps {
  visible?: boolean;
  onClose?: () => void;
  onItemSelect?: (contentId: string) => void; // Callback when user clicks on a log item
}

export const TaskLogViewer: React.FC<TaskLogViewerProps> = ({ visible = false, onClose, onItemSelect }) => {
  const [historyItems, setHistoryItems] = useState<Array<{id: string, query: string, timestamp: number, filePath: string}>>([]);
  const [promptRecords, setPromptRecords] = useState<PromptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'logs'>('history');
  const [expandedPromptIds, setExpandedPromptIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadLogData();
    }
  }, [visible, activeTab]);

  const loadLogData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'history') {
        // Load history files (contains user queries and final documents)
        const historyItemsResult = await HistoryService.getSimpleHistory();
        setHistoryItems(historyItemsResult);
      } else {
        // Load prompt records (contains LLM I/O)
        const promptRecordsResult = PromptTracker.getPromptHistory();
        // Sort by timestamp (newest first)
        const sortedPromptRecords = promptRecordsResult.sort((a, b) => b.timestamp - a.timestamp);
        setPromptRecords(sortedPromptRecords);
      }
    } catch (error) {
      console.error('Error loading log data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePromptExpansion = (promptId: string) => {
    setExpandedPromptIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(promptId)) {
        newSet.delete(promptId);
      } else {
        newSet.add(promptId);
      }
      return newSet;
    });
  };

  const clearAllHistory = async () => {
    if (window.confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
      try {
        // Clear both history files and prompt records regardless of the active tab
        await HistoryService.clearAllHistory();
        await PromptTracker.clearPromptHistory();
        
        // Clear the displayed items in the UI
        setHistoryItems([]);
        setPromptRecords([]);
        
        // Also refresh the entire component to make sure all states are cleared
        // Set loading to true to show loading state during clear process
        setLoading(true);
        
        // Small delay to ensure backend has time to process the deletion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload the data after clearing
        await loadLogData();
        
        setLoading(false);
      } catch (error) {
        console.error('Error clearing history:', error);
        setLoading(false);
      }
    }
  };

  const handleItemClick = (id: string, type: 'history' | 'logs') => {
    if (type === 'history' && onItemSelect) {
      // For history items, load the final generated document
      onItemSelect(id);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await HistoryService.downloadHistoryFile(id);
    } catch (error) {
      console.error('Error downloading history file:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (!visible) return null;

  return (
    <div className="task-log-viewer">
      <div className="log-viewer-header">
        <h3>当前任务日志</h3>
        <div className="log-viewer-controls">
          <div className="tab-controls">
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              生成历史
            </button>
            <button
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              模型IO记录
            </button>
          </div>
          <button onClick={loadLogData} className="refresh-btn" disabled={loading}>
            {loading ? '加载中...' : '刷新'}
          </button>
          <button 
            onClick={clearAllHistory}
            className="clear-btn"
            title="清除所有历史记录"
          >
            🗑️ 清空
          </button>
          <button onClick={onClose} className="close-btn">关闭</button>
        </div>
      </div>

      <div className="log-content">
        {loading ? (
          <p className="loading">加载中...</p>
        ) : activeTab === 'history' ? (
          historyItems.length === 0 ? (
            <p className="no-logs">暂无生成历史</p>
          ) : (
            <div className="log-list">
              {historyItems.map((item) => (
                <div key={item.id} className="log-item history">
                  <div className="log-item-header">
                    <div 
                      className="log-item-title" 
                      onClick={() => onItemSelect && onItemSelect(item.id)}
                    >
                      <strong>{item.query}</strong>
                    </div>
                    <div className="log-item-timestamp">{formatDate(item.timestamp)}</div>
                  </div>
                  <div className="log-item-actions">
                    <button
                      onClick={() => onItemSelect && onItemSelect(item.id)}
                      className="view-btn"
                    >
                      查看文档
                    </button>
                    <button
                      onClick={() => handleDownload && handleDownload(item.id)}
                      className="download-btn"
                    >
                      下载
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          promptRecords.length === 0 ? (
            <p className="no-logs">暂无模型IO记录</p>
          ) : (
            <div className="log-list">
              {promptRecords.map((record) => (
                <div key={record.id} className={`log-item prompt ${record.response ? 'with-response' : 'no-response'}`}>
                  <div className="log-item-header">
                    <div 
                      className="log-item-title" 
                      onClick={() => togglePromptExpansion(record.id)}
                    >
                      <strong>
                        {record.prompt.length > 60 
                          ? record.prompt.substring(0, 60) + '...' 
                          : record.prompt}
                      </strong>
                      {!record.response && (
                        <span className="no-response-badge">⚠️ 无响应</span>
                      )}
                    </div>
                    <div className="log-item-timestamp">{formatDate(record.timestamp)}</div>
                  </div>
                  
                  {expandedPromptIds.has(record.id) && (
                    <div className="prompt-details">
                      <div className="prompt-content">
                        <h4>输入:</h4>
                        <p>{record.prompt}</p>
                      </div>
                      {record.response ? (
                        <div className="response-content">
                          <h4>输出:</h4>
                          <p>{record.response}</p>
                        </div>
                      ) : (
                        <div className="no-response-content">
                          <h4>状态:</h4>
                          <p>无响应 - 请求可能超时或失败</p>
                        </div>
                      )}
                      <div className="detail-actions">
                        <button 
                          className="expand-btn"
                          onClick={() => onItemSelect && onItemSelect(record.id)}
                        >
                          🔍 在主页面显示
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="log-item-actions">
                    <button
                      onClick={() => togglePromptExpansion(record.id)}
                      className="expand-btn"
                    >
                      {expandedPromptIds.has(record.id) ? '收起' : '展开'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <style jsx>{`
        .task-log-viewer {
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

        .log-viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: rgba(30, 41, 59, 0.95); /* Dark header */
          border-bottom: 1px solid rgba(148, 163, 184, 0.3); /* Darker border */
        }

        .log-viewer-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #e2e8f0; /* Light text */
        }

        .log-viewer-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .tab-controls {
          display: flex;
          gap: 0.2rem;
        }

        .tab-btn {
          padding: 0.2rem 0.5rem;
          border: 1px solid rgba(148, 163, 184, 0.5); /* Darker border */
          background: rgba(51, 65, 85, 0.5); /* Dark button background */
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          color: #cbd5e1; /* Light text */
        }

        .tab-btn.active {
          background: rgba(71, 85, 105, 0.9); /* Slightly lighter on hover */
          border-color: rgba(165, 180, 252, 0.6); /* Lighter border on hover */
          color: #f8fafc; /* Lighter text on hover */
        }

        .refresh-btn, .close-btn, .view-btn, .download-btn, .expand-btn, .clear-btn {
          padding: 0.2rem 0.5rem;
          border: 1px solid rgba(148, 163, 184, 0.5); /* Darker border */
          background: rgba(51, 65, 85, 0.7); /* Dark button background */
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          color: #cbd5e1; /* Light text */
        }

        .refresh-btn:hover, .close-btn:hover, .view-btn:hover, .download-btn:hover, .expand-btn:hover, .clear-btn:hover {
          background: rgba(71, 85, 105, 0.9); /* Slightly lighter on hover */
          border-color: rgba(165, 180, 252, 0.6); /* Lighter border on hover */
          color: #f8fafc; /* Lighter text on hover */
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .log-content {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
          color: #e2e8f0; /* Light text */
        }

        .loading, .no-logs {
          text-align: center;
          color: #94a3b8; /* Lighter grey for better contrast */
          margin: 1rem 0;
        }

        .log-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .log-item {
          padding: 0.8rem;
          border: 1px solid rgba(148, 163, 184, 0.3); /* Darker border */
          border-radius: 4px;
          background: rgba(30, 41, 59, 0.6); /* Darker background */
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .log-item.history {
          border-left: 3px solid #3b82f6; /* Blue accent for history records */
        }

        .log-item.prompt {
          border-left: 3px solid #f59e0b; /* Yellow accent for prompt records */
        }

        .log-item-header {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .log-item-title {
          cursor: pointer;
          color: #60a5fa; /* Blue link color */
          margin-bottom: 0.2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .log-item-title:hover {
          color: #93c5fd; /* Lighter blue on hover */
        }

        .log-item-timestamp {
          font-size: 0.8rem;
          color: #94a3b8; /* Lighter grey */
        }

        .log-item-actions {
          display: flex;
          gap: 0.5rem;
        }

        .prompt-details {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(15, 23, 42, 0.4);
          border-radius: 4px;
          border-left: 2px solid #f59e0b; /* Yellow accent */
        }

        .prompt-details h4 {
          margin: 0.3rem 0;
          color: #fbbf24; /* Yellow for input/output headers */
        }

        .prompt-details p {
          margin: 0.3rem 0;
          line-height: 1.5;
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        .detail-actions {
          margin-top: 0.5rem;
          display: flex;
          justify-content: flex-end;
        }
        
        .log-item.prompt.with-response {
          border-left: 3px solid #28a745; /* Green accent for records with responses */
          border: 1px solid rgba(40, 167, 69, 0.3); /* Green border for records with responses */
        }
        
        .log-item.prompt.no-response {
          border-left: 3px solid #dc3545; /* Red accent for records without responses */
          border: 1px solid rgba(220, 53, 69, 0.3); /* Red border for records without responses */
          background-color: rgba(220, 53, 69, 0.05); /* Light red background */
        }
        
        .no-response-badge {
          background: #dc3545;
          color: white;
          padding: 0.1rem 0.4rem;
          border-radius: 12px;
          font-size: 0.7rem;
          margin-left: 0.5rem;
        }
        
        .no-response-content {
          color: #dc3545; /* Red text for no response status */
          background-color: rgba(220, 53, 69, 0.1); /* Light red background */
          padding: 0.5rem;
          border-radius: 4px;
          border-left: 2px solid #dc3545; /* Red accent */
        }
      `}</style>
    </div>
  );
};