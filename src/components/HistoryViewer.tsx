// History Viewer Component
import React, { useState, useEffect } from 'react';
import { HistoryService } from '../utils/HistoryService';
import { PromptTracker } from '../utils/PromptTracker';
import { PromptRecord } from '../utils/PromptTracker';

interface HistoryViewerProps {
  visible?: boolean;
  onClose?: () => void;
  onItemSelect?: (contentId: string) => void; // Callback when user clicks on a history item
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({ visible = false, onClose, onItemSelect }) => {
  const [historyItems, setHistoryItems] = useState<Array<{id: string, title: string, timestamp: number, filePath: string, type: 'content' | 'prompt'}>>([]);
  const [promptRecords, setPromptRecords] = useState<PromptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'content' | 'prompts'>('all');

  useEffect(() => {
    if (visible) {
      loadAllData();
    }
  }, [visible]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load both history files and prompt records in parallel
      const [historyItemsResult, promptRecordsResult] = await Promise.allSettled([
        HistoryService.getAllHistoryFiles(),
        PromptTracker.getPromptHistory()
      ]);

      let historyItems: Array<{id: string, title: string, timestamp: number, filePath: string, type: 'content' | 'prompt'}> = [];
      let promptRecords: PromptRecord[] = [];

      if (historyItemsResult.status === 'fulfilled') {
        // Sort by timestamp (newest first) and add type
        historyItems = historyItemsResult.value.map(item => ({
          ...item,
          type: 'content' as const
        })).sort((a, b) => b.timestamp - a.timestamp);
      } else {
        console.error('Error loading history:', historyItemsResult.reason);
      }

      if (promptRecordsResult.status === 'fulfilled') {
        // Sort by timestamp (newest first)
        promptRecords = promptRecordsResult.value.sort((a, b) => b.timestamp - a.timestamp);
      } else {
        console.error('Error loading prompt records:', promptRecordsResult.reason);
      }

      setHistoryItems(historyItems);
      setPromptRecords(promptRecords);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const items = await HistoryService.getAllHistoryFiles();
      // Sort by timestamp (newest first) and add type
      const historyItemsWithTypes = items.map(item => ({
        ...item,
        type: 'content' as const
      })).sort((a, b) => b.timestamp - a.timestamp);
      
      setHistoryItems(historyItemsWithTypes);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistoryItems([]);
    }
  };

  const loadPromptRecords = async () => {
    try {
      const records = PromptTracker.getPromptHistory();
      // Sort by timestamp (newest first)
      const sortedRecords = records.sort((a, b) => b.timestamp - a.timestamp);
      setPromptRecords(sortedRecords);
    } catch (error) {
      console.error('Error loading prompt records:', error);
      setPromptRecords([]);
    }
  };

  const refreshAll = async () => {
    await loadAllData();
  };

  const handleItemClick = (id: string, type: 'content' | 'prompt') => {
    if (type === 'content' && onItemSelect) {
      // For content files, pass the filename to load
      onItemSelect(id);
    } else if (type === 'prompt') {
      // For prompt records, we could show the prompt and response in detail view
      // For now, we'll just pass the prompt ID
      if (onItemSelect) {
        onItemSelect(id); // This would need custom handling in the parent component
      }
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

  // Combine and filter based on active tab
  const getAllItems = () => {
    const combined = [
      ...historyItems.map(item => ({ ...item, type: 'content' as const })),
      ...promptRecords.map(record => ({ 
        id: record.id, 
        title: record.prompt.substring(0, 50) + (record.prompt.length > 50 ? '...' : ''), 
        timestamp: record.timestamp, 
        filePath: '', 
        type: 'prompt' as const 
      }))
    ];
    
    // Sort by timestamp (newest first)
    combined.sort((a, b) => b.timestamp - a.timestamp);
    
    if (activeTab === 'content') {
      return combined.filter(item => item.type === 'content');
    } else if (activeTab === 'prompts') {
      return combined.filter(item => item.type === 'prompt');
    }
    return combined;
  };

  const allItems = getAllItems();

  if (!visible) return null;

  return (
    <div className="history-viewer">
      <div className="history-header">
        <h3>历史记录</h3>
        <div className="history-controls">
          <div className="tab-controls">
            <button 
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              全部
            </button>
            <button 
              className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
              onClick={() => setActiveTab('content')}
            >
              内容
            </button>
            <button 
              className={`tab-btn ${activeTab === 'prompts' ? 'active' : ''}`}
              onClick={() => setActiveTab('prompts')}
            >
              提示
            </button>
          </div>
          <button onClick={refreshAll} className="refresh-btn" disabled={loading}>
            {loading ? '加载中...' : '刷新'}
          </button>
          <button onClick={onClose} className="close-btn">关闭</button>
        </div>
      </div>

      <div className="history-content">
        {loading ? (
          <p className="loading">加载中...</p>
        ) : allItems.length === 0 ? (
          <p className="no-history">暂无历史记录</p>
        ) : (
          <div className="history-list">
            {allItems.map((item) => (
              <div key={item.id} className={`history-item ${item.type}`}>
                <div className="history-item-header">
                  <div 
                    className="history-item-title" 
                    onClick={() => handleItemClick(item.id, item.type)}
                  >
                    <strong>{item.title}</strong>
                    {item.type === 'prompt' && (
                      <span className="item-type-badge">提示</span>
                    )}
                  </div>
                  <div className="history-item-timestamp">{formatDate(item.timestamp)}</div>
                </div>
                <div className="history-item-actions">
                  <button 
                    onClick={() => handleItemClick(item.id, item.type)} 
                    className="view-btn"
                  >
                    {item.type === 'prompt' ? '查看提示' : '查看'}
                  </button>
                  {item.type === 'content' && (
                    <button 
                      onClick={() => handleDownload(item.id)} 
                      className="download-btn"
                    >
                      下载
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .history-viewer {
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

        .refresh-btn, .close-btn, .view-btn, .download-btn {
          padding: 0.2rem 0.5rem;
          border: 1px solid rgba(148, 163, 184, 0.5); /* Darker border */
          background: rgba(51, 65, 85, 0.7); /* Dark button background */
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          color: #cbd5e1; /* Light text */
        }

        .refresh-btn:hover, .close-btn:hover, .view-btn:hover, .download-btn:hover {
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

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .history-item {
          padding: 0.8rem;
          border: 1px solid rgba(148, 163, 184, 0.3); /* Darker border */
          border-radius: 4px;
          background: rgba(30, 41, 59, 0.6); /* Darker background */
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .history-item.prompt {
          border-left: 3px solid #f59e0b; /* Yellow accent for prompt records */
        }

        .history-item.content {
          border-left: 3px solid #3b82f6; /* Blue accent for content records */
        }

        .history-item-header {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .history-item-title {
          cursor: pointer;
          color: #60a5fa; /* Blue link color */
          margin-bottom: 0.2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .history-item-title:hover {
          color: #93c5fd; /* Lighter blue on hover */
        }

        .item-type-badge {
          background: rgba(245, 158, 11, 0.2); /* Yellow background */
          color: #fbbf24; /* Lighter yellow text */
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          font-size: 0.7rem;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .history-item-timestamp {
          font-size: 0.8rem;
          color: #94a3b8; /* Lighter grey for better contrast */
        }

        .history-item-actions {
          display: flex;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
};